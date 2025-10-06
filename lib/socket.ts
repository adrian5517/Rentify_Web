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
      console.log('✅ Socket connected successfully!');
      console.log('📡 Socket ID:', socket?.id);
      console.log('👤 Registering user:', userId);
      socket?.emit('register', userId);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected');
      console.log('🔍 Reason:', reason);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('🔍 Full error:', error);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnection attempt #', attemptNumber);
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
    console.log('Socket manually disconnected');
  }
};
