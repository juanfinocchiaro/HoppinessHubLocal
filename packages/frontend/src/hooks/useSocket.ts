import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let globalSocket: Socket | null = null;

function getSocket(): Socket {
  if (!globalSocket) {
    globalSocket = io('/', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket>(getSocket());

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket.connected) {
      socket.connect();
    }
    return () => {
      // Don't disconnect - shared singleton
    };
  }, []);

  return socketRef.current;
}

export function useBranchSocket(branchId: string | null) {
  const socket = useSocket();

  useEffect(() => {
    if (!branchId) return;
    socket.emit('join:branch', branchId);
    return () => {
      socket.emit('leave:branch', branchId);
    };
  }, [socket, branchId]);

  return socket;
}

export function useKitchenSocket(branchId: string | null) {
  const socket = useSocket();

  useEffect(() => {
    if (!branchId) return;
    socket.emit('join:kitchen', branchId);
    return () => {
      socket.emit('leave:kitchen', branchId);
    };
  }, [socket, branchId]);

  return socket;
}

export function useOrderSocket(orderId: string | null) {
  const socket = useSocket();

  useEffect(() => {
    if (!orderId) return;
    socket.emit('join:order', orderId);
    return () => {
      socket.emit('leave:order', orderId);
    };
  }, [socket, orderId]);

  return socket;
}

// Non-hook helper for services
export function getSocketInstance(): Socket {
  return getSocket();
}

export function subscribeToEvent<T = any>(
  event: string,
  callback: (data: T) => void,
  room?: string,
): () => void {
  const socket = getSocket();
  if (room) {
    socket.emit('join', room);
  }
  socket.on(event, callback);
  return () => {
    socket.off(event, callback);
    if (room) {
      socket.emit('leave', room);
    }
  };
}
