import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

export function useSocket(groupId: string) {
  const token = useAuthStore((s) => s.token);
  const { addMessage, setTyping, updateReaction } = useChatStore();
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!token || !groupId) return;
    const socket = getSocket(token);

    const joinRoom = () => socket.emit('join_group', groupId);
    joinRoom();
    socket.on('connect', joinRoom);
    socket.on('new_message', (message) => addMessage(groupId, message));
    socket.on('reaction_update', ({ messageId, emoji, count }) =>
      updateReaction(groupId, messageId, emoji, count),
    );
    socket.on('user_typing', ({ alias }) => setTyping(groupId, alias, true));
    socket.on('user_stopped_typing', ({ alias }) => setTyping(groupId, alias, false));

    return () => {
      socket.off('connect', joinRoom);
      socket.off('new_message');
      socket.off('reaction_update');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [groupId, token, addMessage, updateReaction, setTyping]);

  const sendMessage = (content: string) => {
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('send_message', { groupId, content });
  };

  const sendTyping = (isTyping: boolean) => {
    if (!token) return;
    const socket = getSocket(token);
    if (isTyping) {
      socket.emit('typing_start', { groupId });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        socket.emit('typing_stop', { groupId });
      }, 3000);
    } else {
      socket.emit('typing_stop', { groupId });
    }
  };

  const sendReaction = (messageId: string, emoji: string) => {
    if (!token) return;
    const socket = getSocket(token);
    socket.emit('add_reaction', { groupId, messageId, emoji });
  };

  return { sendMessage, sendTyping, sendReaction };
}
