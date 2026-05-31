import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getSessionAlias } from '../lib/alias';
import { useChatStore } from '../store/chatStore';

export function useSocket(groupId: string) {
  const { addMessage, setTyping, updateReaction } = useChatStore();
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const aliasRef = useRef(getSessionAlias());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!groupId) return;
    const channel = supabase.channel(`group:${groupId}`, {
      config: { broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `group_id=eq.${groupId}` },
        (payload) => {
          const message = payload.new as {
            id: string;
            content: string;
            alias: string;
            sent_at: string;
          };
          addMessage(groupId, { ...message, reactions: {} });
        },
      )
      .on('broadcast', { event: 'reaction_update' }, ({ payload }) => {
        if (!payload) return;
        updateReaction(groupId, payload.messageId, payload.emoji, payload.count);
      })
      .on('broadcast', { event: 'typing_start' }, ({ payload }) => {
        if (!payload?.alias) return;
        setTyping(groupId, payload.alias, true);
      })
      .on('broadcast', { event: 'typing_stop' }, ({ payload }) => {
        if (!payload?.alias) return;
        setTyping(groupId, payload.alias, false);
      })
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [groupId, addMessage, updateReaction, setTyping]);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim().slice(0, 1000);
    if (!trimmed) return;
    const sanitized = trimmed.replace(/<[^>]*>/g, '').trim();
    if (!sanitized) return;

    const alias = aliasRef.current;
    const { error } = await supabase
      .from('messages')
      .insert({ group_id: groupId, content: sanitized, alias })
      .select('id')
      .single();
    if (error) throw error;
  };

  const sendTyping = (isTyping: boolean) => {
    const channel = channelRef.current;
    if (!channel) return;
    if (isTyping) {
      channel.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: { alias: aliasRef.current },
      });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        channel.send({
          type: 'broadcast',
          event: 'typing_stop',
          payload: { alias: aliasRef.current },
        });
      }, 3000);
    } else {
      channel.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: { alias: aliasRef.current },
      });
    }
  };

  const sendReaction = async (messageId: string, emoji: string) => {
    const { data: existing, error: existingError } = await supabase
      .from('reactions')
      .select('id, count')
      .eq('message_id', messageId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existingError) throw existingError;

    let count = 1;
    if (existing) {
      count = existing.count + 1;
      const { error } = await supabase.from('reactions').update({ count }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('reactions').insert({
        message_id: messageId,
        emoji,
        count,
      });
      if (error) throw error;
    }

    channelRef.current?.send({
      type: 'broadcast',
      event: 'reaction_update',
      payload: { messageId, emoji, count },
    });
  };

  return { sendMessage, sendTyping, sendReaction };
}
