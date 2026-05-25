const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const Coordinator = require('./coordinator');

// App Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // For development
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

// Global Exception Handlers to Prevent Crash
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.json({ status: 'active', message: 'ComputeShare Coordinator is running.' });
});

// Initialize Coordinator Orchestration
const coordinator = new Coordinator(io);

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`[NETWORK] New connection: ${socket.id}`);
  
  // Delegate connection handling to the intelligent Coordinator
  coordinator.handleConnection(socket);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SYSTEM] ComputeShare Coordinator listening on port ${PORT}`);
});
