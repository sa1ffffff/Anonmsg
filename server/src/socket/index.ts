import type { Server } from 'socket.io';
import { registerSocketHandlers } from './handlers.js';

export function initSocket(io: Server) {
  registerSocketHandlers(io);
}
