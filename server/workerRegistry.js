const { stmts } = require('./db');

class WorkerRegistry {
  constructor() {
    this.workers = new Map(); // socketId -> workerData
    this.HEARTBEAT_TIMEOUT = 15000;
  }

  registerWorker(socketId, workerId, capabilities) {
    stmts.upsertWorker.run(workerId, socketId);
    
    // Check if worker is reconnecting within heartbeat window to restore session
    const existingWorker = Array.from(this.workers.values()).find(w => w.workerId === workerId);
    
    if (existingWorker) {
      this.workers.delete(existingWorker.socketId);
    }
    
    this.workers.set(socketId, {
      socketId,
      workerId,
      capabilities: capabilities || ['js', 'wasm'],
      trustScore: 100.0,
      activeAssignments: new Set(),
      lastHeartbeat: Date.now(),
      throughputAvg: 0
    });
    
    console.log(`[REGISTRY] Worker Registered: ${workerId} via ${socketId}`);
  }

  heartbeat(socketId, stats) {
    const worker = this.workers.get(socketId);
    if (!worker) return false;
    
    worker.lastHeartbeat = Date.now();
    if (stats) {
      worker.throughputAvg = (worker.throughputAvg * 0.8) + (stats.opsPerSec * 0.2);
    }
    stmts.updateWorkerActivity.run(worker.workerId);
    return true;
  }

  removeWorker(socketId) {
    const worker = this.workers.get(socketId);
    if (!worker) return null;
    
    const orphanedChunks = Array.from(worker.activeAssignments);
    this.workers.delete(socketId);
    console.log(`[REGISTRY] Worker Disconnected: ${worker.workerId}`);
    return orphanedChunks;
  }

  selectWorkers(count, requirements = {}) {
    const candidates = Array.from(this.workers.values()).filter(w => {
      // Must not be dead
      if (Date.now() - w.lastHeartbeat > this.HEARTBEAT_TIMEOUT) return false;
      // Must meet capabilities (wasm filter)
      if (requirements.capabilities && !requirements.capabilities.every(c => w.capabilities.includes(c))) return false;
      // Filter out overly burdened workers
      if (w.activeAssignments.size > 5) return false;
      return true;
    });

    // Sort by least busy, then by highest trust
    candidates.sort((a, b) => {
      if (a.activeAssignments.size !== b.activeAssignments.size) {
        return a.activeAssignments.size - b.activeAssignments.size;
      }
      return b.trustScore - a.trustScore;
    });

    return candidates.slice(0, count);
  }

  selectTieBreaker(excludeWorkerIds) {
    const candidates = Array.from(this.workers.values()).filter(w => {
      if (Date.now() - w.lastHeartbeat > this.HEARTBEAT_TIMEOUT) return false;
      if (excludeWorkerIds.includes(w.workerId)) return false;
      return true;
    });

    // Select the highest trust score worker
    candidates.sort((a, b) => b.trustScore - a.trustScore);
    return candidates[0] || null;
  }
}

module.exports = new WorkerRegistry();
