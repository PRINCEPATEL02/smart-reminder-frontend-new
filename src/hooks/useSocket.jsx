import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const useSocket = () => {
  const socketRef = useRef(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user) return;

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Socket connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Real-time reminder events → invalidate React Query cache
    socket.on('reminder:created', (reminder) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminders', 'today'] });
      queryClient.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
      toast.success(`✅ Reminder created: ${reminder.title}`);
    });

    socket.on('reminder:updated', (reminder) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminders', 'today'] });
      queryClient.setQueryData(['reminder', reminder._id], reminder);
    });

    socket.on('reminder:deleted', ({ id }) => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['reminders', 'today'] });
      queryClient.removeQueries({ queryKey: ['reminder', id] });
    });

    // Push notification from server cron
    socket.on('notification', (data) => {
      const { type, message } = data;
      if (type === 'reminder_due') {
        toast.custom(
          (t) => (
            <div
              className={`flex items-start gap-3 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg max-w-sm ${
                t.visible ? 'animate-slide-in' : 'opacity-0'
              }`}
            >
              <span className="text-2xl">⏰</span>
              <div>
                <p className="font-semibold text-sm">{message}</p>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
        // Invalidate upcoming reminders
        queryClient.invalidateQueries({ queryKey: ['reminders', 'upcoming'] });
      } else if (type === 'reminder_missed') {
        toast.custom(
          (t) => (
            <div
              className={`flex items-start gap-3 bg-red-500 text-white px-4 py-3 rounded-xl shadow-lg max-w-sm ${
                t.visible ? 'animate-slide-in' : 'opacity-0'
              }`}
            >
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-sm">{message}</p>
              </div>
            </div>
          ),
          { duration: 8000 }
        );
        queryClient.invalidateQueries({ queryKey: ['reminders'] });
        queryClient.invalidateQueries({ queryKey: ['reminders', 'missed'] });
      }
    });
  }, [user, queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user) connect();
    return () => disconnect();
  }, [user, connect, disconnect]);

  return { socket: socketRef.current };
};
