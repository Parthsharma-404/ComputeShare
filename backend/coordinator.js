const workerRegistry = require('./workerRegistry');
const taskSplitter = require('./taskSplitter');
const { db, stmts } = require('./db');
const crypto = require('crypto');

class Coordinator {
  constructor(io) {
    this.io = io;
    this.chunkResults = new Map(); // chunkId -> { results: [], assignedTo: Set() }
    
    // Heartbeat & GC Loop
    setInterval(() => this.garbageCollectWorkers(), 10000);
    // Dispatch Loop
    setInterval(() => this.dispatchPendingChunks(), 500);
    // Telemetry Broadcast
    setInterval(() => this.broadcastTelemetry(), 2000);
  }

  handleConnection(socket) {
    socket.on('register', (data) => {
      workerRegistry.registerWorker(socket.id, data.workerId, data.capabilities);
      socket.emit('registered', { status: 'success', threshold: '2-of-3 BFT' });
    });

    socket.on('heartbeat', (stats) => {
      const isAlive = workerRegistry.heartbeat(socket.id, stats);
      if (!isAlive) {
        socket.emit('error', 'Unregistered session. Please reconnect.');
        socket.disconnect();
      }
    });

    socket.on('submit_result', (data) => {
      this.handleChunkResult(socket.id, data.chunkId, data.result, data.hash);
    });

    socket.on('disconnect', () => {
      const orphanedChunks = workerRegistry.removeWorker(socket.id);
      if (orphanedChunks && orphanedChunks.length > 0) {
        orphanedChunks.forEach(chunkId => {
          console.log(`[FAULT-TOLERANCE] Reassigning orphaned chunk: ${chunkId}`);
          taskSplitter.reassignChunk(chunkId);
          
          // Remove from active tracking map for this worker
          if (this.chunkResults.has(chunkId)) {
            this.chunkResults.get(chunkId).assignedTo.delete(socket.id);
          }
        });
      }
    });
  }

  dispatchPendingChunks() {
    // Basic dispatcher targeting 2-of-3 redundancy
    let pendingItem;
    while ((pendingItem = taskSplitter.getNextAvailableChunk())) {
      const { chunkId, copiesNeeded } = pendingItem;
      const workers = workerRegistry.selectWorkers(copiesNeeded);
      
      if (workers.length === 0) {
        // No workers available, put back in queue
        taskSplitter.reassignChunk(chunkId);
        break;
      }

      // Initialize verification tracking
      if (!this.chunkResults.has(chunkId)) {
        this.chunkResults.set(chunkId, { results: [], assignedTo: new Set() });
      }

      const chunkData = db.prepare('SELECT * FROM chunks WHERE id = ?').get(chunkId);

      workers.forEach(w => {
        w.activeAssignments.add(chunkId);
        this.chunkResults.get(chunkId).assignedTo.add(w.socketId);
        this.io.to(w.socketId).emit('assign_chunk', chunkData);
      });
      
      stmts.updateChunkResult.run('processing', null, null, chunkId);
    }
  }

  handleChunkResult(socketId, chunkId, result, providedHash) {
    const worker = workerRegistry.workers.get(socketId);
    if (!worker) return;

    worker.activeAssignments.delete(chunkId);
    stmts.addWorkerStats.run(0.001, worker.workerId); // stub cpu hours addition

    const state = this.chunkResults.get(chunkId);
    if (!state) return; // Already resolved or invalid

    // Verify hash integrity mathematically if not provided
    const hash = providedHash || crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex');
    
    state.results.push({ workerId: worker.workerId, socketId, result, hash });

    // Check for Consensus
    if (state.results.length >= 2) {
      if (state.results[0].hash === state.results[1].hash) {
        // MATCH - Success!
        this.finalizeChunk(chunkId, state.results[0].result, state.results[0].hash, 'completed');
        
        // Reward workers
        stmts.updateWorkerTrust.run(1.0, state.results[0].workerId);
        stmts.updateWorkerTrust.run(1.0, state.results[1].workerId);
        
        this.io.emit('bft_event', { type: 'success', chunkId, workers: [state.results[0].workerId, state.results[1].workerId] });
      } else {
        // CONFLICT - Trigger tie breaker
        console.log(`[CONSENSUS] Conflict detected on chunk ${chunkId}. Initiating tie-breaker.`);
        this.io.emit('bft_event', { type: 'conflict', chunkId });
        
        // Select high trust tie-breaker
        if (state.results.length === 2) {
          const tieBreaker = workerRegistry.selectTieBreaker([state.results[0].workerId, state.results[1].workerId]);
          if (tieBreaker) {
            tieBreaker.activeAssignments.add(chunkId);
            state.assignedTo.add(tieBreaker.socketId);
            const chunkData = db.prepare('SELECT * FROM chunks WHERE id = ?').get(chunkId);
            this.io.to(tieBreaker.socketId).emit('assign_chunk', chunkData);
          } else {
            // Queue for later if no tie breaker available
            taskSplitter.reassignChunk(chunkId);
          }
        } else if (state.results.length >= 3) {
          // 3 results, find the majority
          const hashes = state.results.map(r => r.hash);
          const majorityHash = this.getMajority(hashes);
          
          if (majorityHash) {
            const correctWorkers = state.results.filter(r => r.hash === majorityHash);
            const maliciousWorkers = state.results.filter(r => r.hash !== majorityHash);
            
            this.finalizeChunk(chunkId, correctWorkers[0].result, majorityHash, 'completed');
            
            // Penalize malicious, reward correct
            correctWorkers.forEach(w => stmts.updateWorkerTrust.run(1.5, w.workerId));
            maliciousWorkers.forEach(w => {
              console.log(`[TRUST] Penalizing worker ${w.workerId} for malicious result.`);
              stmts.updateWorkerTrust.run(-20.0, w.workerId);
            });
            
          } else {
            // Unresolvable 3-way conflict (extremely rare), flag as error
            this.finalizeChunk(chunkId, null, null, 'failed');
            stmts.updateChunkResult.run('error', null, null, chunkId);
          }
        }
      }
    }
  }

  getMajority(arr) {
    const counts = {};
    for (const num of arr) {
      counts[num] = counts[num] ? counts[num] + 1 : 1;
      if (counts[num] >= 2) return num;
    }
    return null;
  }

  finalizeChunk(chunkId, result, hash, status) {
    // 1. Update chunk row
    stmts.updateChunkResult.run(status, JSON.stringify(result), hash, chunkId);
    
    // 2. Remove from tracking
    this.chunkResults.delete(chunkId);
    
    // 3. Update task progress
    const chunkInfo = db.prepare('SELECT task_id FROM chunks WHERE id = ?').get(chunkId);
    if (chunkInfo) {
      stmts.updateTaskProgress.run(chunkInfo.task_id);
      
      // Check if task is complete
      const task = db.prepare('SELECT total_chunks, completed_chunks FROM tasks WHERE id = ?').get(chunkInfo.task_id);
      if (task.completed_chunks >= task.total_chunks) {
        stmts.completeTask.run(chunkInfo.task_id);
        console.log(`[SYSTEM] Task ${chunkInfo.task_id} fully completed!`);
        this.io.emit('task_completed', { taskId: chunkInfo.task_id });
      }
    }
  }

  garbageCollectWorkers() {
    const now = Date.now();
    for (const [socketId, worker] of workerRegistry.workers.entries()) {
      if (now - worker.lastHeartbeat > workerRegistry.HEARTBEAT_TIMEOUT) {
        console.log(`[GC] Removing timed out worker ${worker.workerId}`);
        const orphaned = workerRegistry.removeWorker(socketId);
        
        // Disconnect socket if still alive
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) socket.disconnect();

        if (orphaned) {
          orphaned.forEach(chunkId => taskSplitter.reassignChunk(chunkId));
        }
      }
    }
  }

  broadcastTelemetry() {
    const activeWorkers = workerRegistry.workers.size;
    let totalOps = 0;
    workerRegistry.workers.forEach(w => totalOps += w.throughputAvg);
    
    this.io.emit('telemetry', {
      activeWorkers,
      globalThroughput: totalOps,
      timestamp: Date.now()
    });
  }
}

module.exports = Coordinator;
