import { io } from 'socket.io-client';

// Connect to the locally running NebulaGrid coordinator
const URL = 'http://localhost:3001';

export const socket = io(URL, {
  autoConnect: false, // We will connect manually when the user starts computing
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Basic connection logging
socket.on('connect', () => {
  console.log('[NETWORK] Connected to Coordinator Gateway:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[NETWORK] Disconnected:', reason);
});
