import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';

let io: SocketIOServer;

export function initSocketServer(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://localhost:8080'],
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join:branch', (branchId: string) => {
      socket.join(`branch:${branchId}`);
    });

    socket.on('leave:branch', (branchId: string) => {
      socket.leave(`branch:${branchId}`);
    });

    socket.on('join:order', (orderId: string) => {
      socket.join(`order:${orderId}`);
    });

    socket.on('leave:order', (orderId: string) => {
      socket.leave(`order:${orderId}`);
    });

    socket.on('join:kitchen', (branchId: string) => {
      socket.join(`kitchen:${branchId}`);
    });

    socket.on('leave:kitchen', (branchId: string) => {
      socket.leave(`kitchen:${branchId}`);
    });

    // Generic join/leave used by subscribeToEvent on the client
    socket.on('join', (room: string) => {
      socket.join(room);
    });

    socket.on('leave', (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

export function emitToRoom(room: string, event: string, data: unknown) {
  getIO().to(room).emit(event, data);
}
