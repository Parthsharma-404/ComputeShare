const express = require('express');
const { db, stmts } = require('../db');
const taskSplitter = require('../taskSplitter');

const router = express.Router();

// GET Global Network Stats
router.get('/stats', (req, res) => {
  const activeTasks = db.prepare("SELECT count(*) as count FROM tasks WHERE status = 'pending'").get().count;
  const completedTasks = db.prepare("SELECT count(*) as count FROM tasks WHERE status = 'completed'").get().count;
  const totalVerifiedChunks = db.prepare("SELECT count(*) as count FROM chunks WHERE status = 'completed'").get().count;
  
  const workerStats = db.prepare("SELECT SUM(cpu_hours) as total_cpu, COUNT(*) as all_workers FROM workers").get();

  res.json({
    activeTasks,
    completedTasks,
    totalVerifiedChunks,
    totalCpuHours: workerStats.total_cpu || 0,
    registeredWorkers: workerStats.all_workers
  });
});

// GET Leaderboard
router.get('/leaderboard', (req, res) => {
  const leaders = db.prepare(`
    SELECT id, trust_score, chunks_processed, cpu_hours 
    FROM workers 
    ORDER BY trust_score DESC, chunks_processed DESC 
    LIMIT 10
  `).all();
  
  res.json(leaders);
});

// POST Submit a New Task
router.post('/tasks/submit', (req, res) => {
  try {
    const payload = req.body;
    if (!payload.type) return res.status(400).json({ error: 'Missing task type' });
    
    // Pass to orchestration engine
    const { taskId, totalChunks } = taskSplitter.splitTask(payload);
    
    res.json({
      status: 'accepted',
      taskId,
      totalChunks,
      message: 'Task submitted successfully to the computation pool.'
    });
  } catch (error) {
    console.error('[API] Error submitting task:', error);
    res.status(500).json({ error: 'Internal server error while processing task submission.' });
  }
});

// GET Task Status
router.get('/tasks/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  res.json({
    id: task.id,
    type: task.type,
    status: task.status,
    progress: ((task.completed_chunks / task.total_chunks) * 100).toFixed(2) + '%',
    completedChunks: task.completed_chunks,
    totalChunks: task.total_chunks
  });
});

// GET Task Results (Download JSON)
router.get('/tasks/:id/results', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task || task.status !== 'completed') {
    return res.status(400).json({ error: 'Task not completed or unavailable.' });
  }

  const chunks = db.prepare('SELECT index_num, result FROM chunks WHERE task_id = ? ORDER BY index_num ASC').all();
  
  // Aggregate results deterministically
  const resultsList = chunks.map(c => JSON.parse(c.result));
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="nebulagrid_task_${task.id}.json"`);
  res.send(JSON.stringify(resultsList, null, 2));
});

module.exports = router;
