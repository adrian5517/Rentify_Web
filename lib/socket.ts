import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initializeSocket = (userId: string) => {
  if (!socket) {
    socket = io('https://rentify-server-ge0f.onrender.com', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      // Socket connected (sensitive details suppressed)
      socket?.emit('register', userId);
    });

    socket.on('disconnect', (reason) => {
      // Socket disconnected (reason suppressed)
    });

    socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('🔍 Full error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      // Socket reconnected (attempt number suppressed)
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      // Reconnection attempt (details suppressed)
    });

    socket.on('reconnect_error', (error: Error) => {
      console.error('❌ Reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('❌ Reconnection failed after all attempts');
    });
  }

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    // Socket manually disconnected (suppressed)
  }
};

// Typing indicator functions
export const emitTyping = (senderId: string, receiverId: string) => {
    if (socket && socket.connected) {
    socket.emit('typing-start', { senderId, receiverId });
    // Typing indicator sent (receiver id suppressed)
  }
};

export const emitStopTyping = (senderId: string, receiverId: string) => {
    if (socket && socket.connected) {
    socket.emit('typing-stop', { senderId, receiverId });
    // Stop typing indicator sent (receiver id suppressed)
  }
};

// Read receipts functions
export const markMessagesAsRead = (userId: string, otherUserId: string) => {
    if (socket && socket.connected) {
    socket.emit('mark-as-read', { userId, otherUserId });
    // Marking messages as read (other user id suppressed)
  }
};
