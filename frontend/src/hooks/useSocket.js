import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Create socket connection
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError(error.message);
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      setError(error.message);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  // Function to subscribe to video status updates
  const subscribeToVideoUpdates = (callback) => {
    if (!socketRef.current) return;

    const socket = socketRef.current;

    // Listen for job status updates
    socket.on('job-started', (data) => {
      console.log('Job started:', data);
      callback('started', data);
    });

    socket.on('job-progress', (data) => {
      console.log('Job progress:', data);
      callback('progress', data);
    });

    socket.on('job-completed', (data) => {
      console.log('Job completed:', data);
      callback('completed', data);
    });

    socket.on('job-failed', (data) => {
      console.log('Job failed:', data);
      callback('failed', data);
    });

    socket.on('status-update', (data) => {
      console.log('Status update:', data);
      callback('status-update', data);
    });

    // Return cleanup function
    return () => {
      socket.off('job-started');
      socket.off('job-progress');
      socket.off('job-completed');
      socket.off('job-failed');
      socket.off('status-update');
    };
  };

  // Function to emit events
  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    error,
    subscribeToVideoUpdates,
    emit,
  };
};

export default useSocket;
