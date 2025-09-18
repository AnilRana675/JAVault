// src/hooks/useSocket.ts
// Custom hook for connecting to backend Socket.IO and handling events
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket(onEvent: (event: string, data: any) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('status-update', (data) => onEvent('status-update', data));
    socket.on('job-completed', (data) => onEvent('job-completed', data));
    socket.on('job-failed', (data) => onEvent('job-failed', data));

    return () => {
      socket.disconnect();
    };
  }, [onEvent]);

  return socketRef;
}
