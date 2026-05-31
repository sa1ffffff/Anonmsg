import type { Server } from 'socket.io';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

const ALIASES = [
  'Silent Wave',
  'Neon Echo',
  'Paper Moon',
  'Velvet Signal',
  'Night Library',
  'Ghost Writer',
  'Amber Static',
  'Quiet Riot',
  'Midnight Atlas',
  'Crimson Note',
  'Silver Lumen',
  'Blue Mirage',
  'Nova Drift',
  'Soft Cipher',
  'Shadow Bloom',
  'Ink Spiral',
  'Low Key',
  'Frostline',
  'Echo Vale',
  'Mothlight',
  'Driftwood',
  'Cloud Signal',
  'Pulse Thread',
  'Static Bloom',
  'Orchid Lane',
  'Sable Tide',
  'Ghost Current',
  'Lo-fi Tide',
  'Night Radio',
  'Pale Orbit',
  'Signal Bloom',
  'Lunar Memo',
  'Cinder Loop',
  'Soft Horizon',
  'Quiet Voyager',
  'Neon Hollow',
  'Paper Lantern',
  'Velvet Night',
  'Arcade Rain',
  'Deep Orchard',
  'Grey Wolf',
  'Silver Fox',
  'Red Panda',
  'Blue Whale',
  'Jade Crane',
  'Crimson Hawk',
  'Teal Otter',
  'Onyx Raven',
  'Pearl Deer',
  'Cobalt Lynx',
  'Rust Falcon',
  'Dusk Heron',
  'Ivory Crane',
  'Amber Tiger',
  'Saffron Finch',
  'Moss Finch',
  'Slate Falcon',
  'Copper Finch',
  'Midnight Koi',
  'Silver Koi',
  'Obsidian Owl',
  'Velvet Owl',
  'Glass Wren',
  'Fog Sparrow',
  'Drift Heron',
  'Blue Heron',
  'Rain Sparrow',
  'Coal Raven',
  'Arctic Fox',
  'Moss Lynx',
  'Crimson Lynx',
  'Halo Deer',
  'Fallow Stag',
  'Luna Moth',
  'Iris Moth',
  'Quartz Finch',
  'Mallow Finch',
  'Raven Tide',
  'Wolf Signal',
  'Night Finch',
  'Shadow Stag',
  'Grey Stag',
  'Arc Fox',
  'Cinder Fox',
  'Wisp Heron',
  'Frost Heron',
  'Silent Kestrel',
  'Sable Kestrel',
  'Ink Raven',
  'Cloud Raven',
  'Golden Lynx',
  'Dusky Lynx',
  'Slate Otter',
  'Mallow Otter',
  'Fog Otter',
  'Quiet Koi',
  'Signal Koi',
  'Drift Owl',
  'Moss Owl',
  'Ivory Owl',
  'Ash Finch',
  'Mistral Finch',
  'Cobalt Finch',
  'Ocean Finch',
  'Signal Wren',
  'Neon Wren',
  'Velvet Wren',
  'Pale Wren',
  'Moss Wren',
  'Whisper Wren',
  'Shadow Koi',
  'Sable Koi',
  'Lunar Fox',
  'Stellar Fox',
  'Arc Raven',
  'Ember Raven',
  'Solace Hawk',
  'Midnight Hawk',
  'Soft Hawk',
  'Pale Hawk',
  'Ivory Hawk',
  'Ashen Hawk',
  'Morrow Hawk',
];

const REACTION_EMOJIS = new Set(['👍', '😂', '❤️', '🔥', '😮', '😢']);

const messageRate = new Map<string, number[]>();

function randomAlias(): string {
  const base = ALIASES[Math.floor(Math.random() * ALIASES.length)];
  const suffix = crypto.randomInt(10, 99);
  return `${base} ${suffix}`;
}

function sanitizeContent(content: string): string {
  const trimmed = content.trim().slice(0, 1000);
  if (!trimmed) return '';
  const stripped = trimmed.replace(/<[^>]*>/g, '').trim();
  return stripped;
}

function isRateLimited(socketId: string) {
  const now = Date.now();
  const windowStart = now - 10_000;
  const timestamps = (messageRate.get(socketId) ?? []).filter((t) => t > windowStart);
  if (timestamps.length >= 10) {
    messageRate.set(socketId, timestamps);
    return true;
  }
  timestamps.push(now);
  messageRate.set(socketId, timestamps);
  return false;
}

async function ensureMember(groupId: string, userId: string) {
  const { data } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  return Boolean(data);
}

export function registerSocketHandlers(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Unauthorized'));

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return next(new Error('Unauthorized'));

    socket.data.userId = data.user.id;
    socket.data.alias = randomAlias();
    return next();
  });

  io.on('connection', (socket) => {
    socket.on('join_group', async (groupId: string) => {
      if (!groupId) return;
      const isMember = await ensureMember(groupId, socket.data.userId);
      if (!isMember) return socket.emit('error', 'Not a member');
      socket.join(groupId);
    });

    socket.on(
      'send_message',
      async ({ groupId, content }: { groupId: string; content: string }) => {
        if (!groupId) return;
        if (isRateLimited(socket.id)) {
          return socket.emit('error', 'Rate limit exceeded');
        }

        const isMember = await ensureMember(groupId, socket.data.userId);
        if (!isMember) return socket.emit('error', 'Not a member');

        const sanitized = sanitizeContent(content);
        if (!sanitized) return;

        const { data: message, error } = await supabase
          .from('messages')
          .insert({ group_id: groupId, content: sanitized, alias: socket.data.alias })
          .select('id, content, alias, sent_at')
          .single();

        if (error || !message) return socket.emit('error', 'Failed to send');

        io.to(groupId).emit('new_message', {
          ...message,
          reactions: {},
        });
      },
    );

    socket.on(
      'add_reaction',
      async ({
        groupId,
        messageId,
        emoji,
      }: {
        groupId: string;
        messageId: string;
        emoji: string;
      }) => {
        if (!groupId || !messageId) return;
        if (!REACTION_EMOJIS.has(emoji)) return;

        const isMember = await ensureMember(groupId, socket.data.userId);
        if (!isMember) return socket.emit('error', 'Not a member');

        const { data: message } = await supabase
          .from('messages')
          .select('id, group_id')
          .eq('id', messageId)
          .single();

        if (!message || message.group_id !== groupId) return;

        const { data: existing } = await supabase
          .from('reactions')
          .select('id, count')
          .eq('message_id', messageId)
          .eq('emoji', emoji)
          .single();

        let count = 1;
        if (existing) {
          count = existing.count + 1;
          const { error } = await supabase.from('reactions').update({ count }).eq('id', existing.id);
          if (error) return socket.emit('error', 'Failed to react');
        } else {
          const { error } = await supabase
            .from('reactions')
            .insert({ message_id: messageId, emoji, count });
          if (error) return socket.emit('error', 'Failed to react');
        }

        io.to(groupId).emit('reaction_update', { messageId, emoji, count });
      },
    );

    socket.on('typing_start', ({ groupId }: { groupId: string }) => {
      if (!groupId) return;
      socket.to(groupId).emit('user_typing', { alias: socket.data.alias });
    });

    socket.on('typing_stop', ({ groupId }: { groupId: string }) => {
      if (!groupId) return;
      socket.to(groupId).emit('user_stopped_typing', { alias: socket.data.alias });
    });

    socket.on('disconnect', () => {
      messageRate.delete(socket.id);
    });
  });
}
