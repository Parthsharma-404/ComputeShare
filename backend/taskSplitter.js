const { v4: uuidv4 } = require('uuid');
const { stmts } = require('./db');

class TaskSplitter {
  constructor() {
    this.pendingChunks = []; // Local queue for immediate dispatch
  }

  /**
   * Accepts a global task submission and generates atomized idempotent chunks.
   * Target ~500ms execution per chunk.
   */
  splitTask(taskPayload) {
    const taskId = uuidv4();
    const type = taskPayload.type;
    let chunks = [];

    switch(type) {
      case 'MATH_RANGE':
        // e.g. f(x) over [0, 1000] split into blocks of 100
        const total = taskPayload.rangeEnd - taskPayload.rangeStart;
        const blockSize = Math.max(1, Math.floor(total / 10)); // 10 chunks heuristic
        let currentStart = taskPayload.rangeStart;
        let index = 0;

        while (currentStart < taskPayload.rangeEnd) {
          const end = Math.min(currentStart + blockSize, taskPayload.rangeEnd);
          chunks.push({
            id: uuidv4(),
            task_id: taskId,
            index_num: index++,
            payload: JSON.stringify({
              func: taskPayload.func,
              start: currentStart,
              end: end,
              step: taskPayload.step
            })
          });
          currentStart = end;
        }
        break;

      case 'PRIME_SEARCH':
      case 'MONTE_CARLO':
      default:
        // Default single chunk fallback
        chunks.push({
          id: uuidv4(),
          task_id: taskId,
          index_num: 0,
          payload: JSON.stringify(taskPayload.data || {})
        });
        break;
    }

    // Persist to SQLite
    stmts.createTask.run(taskId, type, chunks.length);
    
    // Insert Chunks
    for (const c of chunks) {
      stmts.createChunk.run(c.id, c.task_id, c.index_num, c.payload);
      // We push a "job descriptor" to the pending queue twice for 2-of-3 BFT
      // But initially we can just enqueue the chunk id and dispatch 2 copies
      this.pendingChunks.push({ chunkId: c.id, copiesNeeded: 2 });
    }

    return { taskId, totalChunks: chunks.length };
  }

  getNextAvailableChunk() {
    return this.pendingChunks.shift() || null;
  }

  reassignChunk(chunkId) {
    this.pendingChunks.unshift({ chunkId, copiesNeeded: 1 });
  }
}

module.exports = new TaskSplitter();
