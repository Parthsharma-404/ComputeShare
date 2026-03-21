// In-memory mock database simulating better-sqlite3 interfaces to bypass native build constraints on Windows
const workers = new Map();
const tasks = new Map();
const chunks = new Map();

// Helpers for the mock db.prepare()
const db = {
  prepare: (sql) => {
    return {
      get: (...args) => {
        if (sql.includes('SELECT * FROM chunks WHERE id = ?')) return chunks.get(args[0]);
        if (sql.includes('SELECT task_id FROM chunks WHERE id = ?')) return chunks.get(args[0]);
        if (sql.includes('SELECT total_chunks, completed_chunks FROM tasks WHERE id = ?')) return tasks.get(args[0]);
        if (sql.includes('SELECT * FROM tasks WHERE id = ?')) return tasks.get(args[0]);
        if (sql.includes("SELECT count(*) as count FROM tasks WHERE status = 'pending'")) {
          return { count: Array.from(tasks.values()).filter(t => t.status === 'pending').length };
        }
        if (sql.includes("SELECT count(*) as count FROM tasks WHERE status = 'completed'")) {
          return { count: Array.from(tasks.values()).filter(t => t.status === 'completed').length };
        }
        if (sql.includes("SELECT count(*) as count FROM chunks WHERE status = 'completed'")) {
          return { count: Array.from(chunks.values()).filter(c => c.status === 'completed').length };
        }
        if (sql.includes("SELECT SUM(cpu_hours) as total_cpu, COUNT(*) as all_workers FROM workers")) {
          const vals = Array.from(workers.values());
          return { total_cpu: vals.reduce((a, b) => a + b.cpu_hours, 0), all_workers: vals.length };
        }
        return null;
      },
      all: (...args) => {
        if (sql.includes('SELECT index_num, result FROM chunks WHERE task_id = ?')) {
          return Array.from(chunks.values())
            .filter(c => c.task_id === args[0])
            .sort((a,b) => a.index_num - b.index_num)
            .map(c => ({ index_num: c.index_num, result: c.result }));
        }
        if (sql.includes('SELECT id, trust_score, chunks_processed, cpu_hours')) {
          return Array.from(workers.values())
            .sort((a,b) => b.trust_score - a.trust_score || b.chunks_processed - a.chunks_processed)
            .slice(0, 10);
        }
        return [];
      }
    }
  }
};

const stmts = {
  upsertWorker: {
    run: (id, session_uuid) => {
      if (!workers.has(id)) {
        workers.set(id, { id, session_uuid, trust_score: 100.0, cpu_hours: 0, chunks_processed: 0, last_seen: Date.now(), status: 'active' });
      } else {
        const w = workers.get(id);
        w.session_uuid = session_uuid;
        w.last_seen = Date.now();
      }
    }
  },
  updateWorkerActivity: {
    run: (id) => { if (workers.has(id)) workers.get(id).last_seen = Date.now(); }
  },
  updateWorkerTrust: {
    run: (val, id) => { if (workers.has(id)) workers.get(id).trust_score += val; }
  },
  addWorkerStats: {
    run: (cpu, id) => {
      if (workers.has(id)) {
        const w = workers.get(id);
        w.chunks_processed++;
        w.cpu_hours += cpu;
      }
    }
  },
  createTask: {
    run: (id, type, total_chunks) => {
      tasks.set(id, { id, type, total_chunks, completed_chunks: 0, status: 'pending', created_at: Date.now() });
    }
  },
  updateTaskProgress: {
    run: (id) => { if (tasks.has(id)) tasks.get(id).completed_chunks++; }
  },
  completeTask: {
    run: (id) => { if (tasks.has(id)) tasks.get(id).status = 'completed'; }
  },
  createChunk: {
    run: (id, task_id, index_num, payload) => {
      chunks.set(id, { id, task_id, index_num, payload, status: 'pending', result: null, hashes: null });
    }
  },
  updateChunkResult: {
    run: (status, result, hashes, id) => {
      if (chunks.has(id)) {
        const c = chunks.get(id);
        c.status = status;
        if (result !== undefined && result !== null) c.result = result;
        if (hashes !== undefined && hashes !== null) c.hashes = hashes;
      }
    }
  }
};

module.exports = { db, stmts };
