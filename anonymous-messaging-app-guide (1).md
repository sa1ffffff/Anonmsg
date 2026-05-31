# Anonymous Messaging Web App — AI Build Guide

## Project Overview

A web app where users join groups via invite links. The **member list is public** — everyone can see who's in the group. The **chat is fully anonymous** — no name, no avatar, no identifier on any message. The server knows who sent what (Option A) but strips identity before broadcasting and never stores sender_id in the messages table.

**UI Priority: This is a state-of-the-art messaging experience. Every pixel matters. The UI must feel like a premium product — refined, fast, and visually memorable.**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS + shadcn/ui |
| Animation | Framer Motion |
| State | Zustand |
| Real-time | Socket.IO client |
| Backend | Node.js + Express |
| Real-time server | Socket.IO |
| Auth | Supabase Auth (email + Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Frontend deploy | Vercel |
| Backend deploy | Railway |

---

## Repository Structure

```
root/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui primitives
│   │   │   ├── chat/
│   │   │   │   ├── ChatWindow.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── MessageInput.tsx
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   └── ScrollToBottom.tsx
│   │   │   ├── members/
│   │   │   │   ├── MemberList.tsx
│   │   │   │   └── MemberCard.tsx
│   │   │   └── layout/
│   │   │       ├── Sidebar.tsx
│   │   │       └── Navbar.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx             # list of joined groups
│   │   │   ├── Chat.tsx             # main chat page
│   │   │   ├── Join.tsx             # invite link landing
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   └── groupStore.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── socket.ts
│   │   ├── hooks/
│   │   │   ├── useSocket.ts
│   │   │   └── useGroup.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── groups.ts
│   │   │   └── members.ts
│   │   ├── middleware/
│   │   │   ├── authenticate.ts
│   │   │   └── rateLimiter.ts
│   │   ├── socket/
│   │   │   ├── index.ts
│   │   │   └── handlers.ts
│   │   ├── lib/
│   │   │   └── supabase.ts
│   │   └── index.ts
│   ├── .env
│   └── package.json
│
└── supabase/
    └── migrations/
        └── 001_initial.sql
```

---

## Design System

### Aesthetic Direction

**Dark, editorial, and minimal.** Think encrypted terminal meets luxury product. The app should feel like a secure vault that happens to be beautiful. Not a generic dark chat app — something with real character.

- **Theme:** Near-black backgrounds (`#0a0a0b`) with warm off-white text (`#f0ede8`)
- **Accent:** A single electric color — use `#c8f135` (acid lime) OR `#4af4c2` (mint) — pick one and commit
- **No gradients on UI chrome.** Gradients only for decorative atmospheric blobs in backgrounds
- **Surface layering:** `#0a0a0b` → `#111113` → `#18181c` — three dark tones, each surface slightly lighter
- **Borders:** Extremely subtle — `1px solid rgba(255,255,255,0.06)` on cards and panels

### Typography

```css
/* Headings — sharp, editorial */
font-family: 'Syne', sans-serif;  /* weights: 700, 800 */

/* Body / messages — highly readable at small sizes */
font-family: 'DM Sans', sans-serif;  /* weights: 400, 500 */

/* Alias names, timestamps, meta — monospace for that encrypted feel */
font-family: 'JetBrains Mono', monospace;  /* weight: 400 */
```

Load from Google Fonts in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&family=JetBrains+Mono&display=swap" rel="stylesheet">
```

### CSS Variables (`index.css`)

```css
:root {
  --bg-base: #0a0a0b;
  --bg-surface: #111113;
  --bg-elevated: #18181c;
  --bg-hover: #1e1e23;

  --text-primary: #f0ede8;
  --text-secondary: #8b8792;
  --text-muted: #4a4850;

  --accent: #c8f135;          /* acid lime — change to #4af4c2 for mint */
  --accent-dim: rgba(200, 241, 53, 0.12);
  --accent-glow: rgba(200, 241, 53, 0.25);

  --border: rgba(255, 255, 255, 0.06);
  --border-strong: rgba(255, 255, 255, 0.12);

  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;

  --font-display: 'Syne', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## UI — Layout Architecture

### Chat Page (`Chat.tsx`)

Three-panel layout, full viewport height, no scroll on the outer shell:

```
┌──────────────┬────────────────────────────┬──────────────────┐
│   Sidebar    │       Chat Panel           │   Members Panel  │
│   240px      │       flex-1               │   280px          │
│              │                            │                  │
│  [logo]      │  ┌─ Group Header ────────┐ │  Members (12)    │
│              │  │  Group name + count   │ │                  │
│  Groups      │  └───────────────────────┘ │  ○ Silver Fox    │
│  ─────────   │                            │  ○ Red Panda     │
│  > Group 1   │  ┌─ Message Feed ────────┐ │  ○ Jade Crane    │
│    Group 2   │  │  (scrollable)         │ │  ...             │
│    Group 3   │  │                       │ │                  │
│              │  │                       │ │                  │
│              │  └───────────────────────┘ │                  │
│              │                            │                  │
│  [+ New]     │  ┌─ Input Bar ───────────┐ │                  │
│  [Profile]   │  │  [ type a message... ]│ │                  │
│              │  └───────────────────────┘ │                  │
└──────────────┴────────────────────────────┴──────────────────┘
```

On mobile: sidebar collapses to icon rail, members panel hides behind toggle button.

---

## UI — Component Specs

### Sidebar

```
Background: var(--bg-surface)
Border-right: 1px solid var(--border)
Width: 240px, fixed

Logo area:
  - App name in Syne 800, size 15px, letter-spacing: 0.12em, uppercase
  - Small accent dot (4px circle, var(--accent)) after the name

Group list items:
  - Padding: 10px 16px
  - Border-radius: var(--radius-sm)
  - Active state: background var(--accent-dim), left border 2px solid var(--accent)
  - Hover state: background var(--bg-hover)
  - Group name in DM Sans 500, 14px
  - Unread count badge: accent background, black text, 5px border-radius, font-mono 11px

Bottom section:
  - "New Group" button: ghost style, accent color text, + icon
  - User avatar: 32px circle, DM Sans 13px username beside it
```

### Message Feed

```
Background: var(--bg-base)
Padding: 0 24px

Message grouping:
  - Messages from same alias within 5 minutes are grouped
  - First message in group shows alias + timestamp
  - Subsequent messages: no header, just content with 2px top margin

Scroll behavior:
  - Auto-scroll to bottom on new message (with smooth scroll)
  - Show "↓ New messages" pill when scrolled up and new messages arrive
  - "Load earlier" button at top — fade in when at top of scroll
```

### MessageBubble

```
Layout: NO chat bubbles. Discord/Slack-style — full-width rows, not bubbles.

Structure per message group:
┌─────────────────────────────────────────────┐
│  [alias-icon]  Grey Wolf  •  2m ago         │  ← alias header
│               Hey everyone, anyone here?    │  ← message text
│               (hover → show reaction bar)   │
└─────────────────────────────────────────────┘

Alias icon:
  - 32px circle
  - Color derived from alias name (hash → pick from 8 preset dark palette colors)
  - 2-letter initials from alias in font-mono 11px
  - NOT an avatar — just a colored circle, reinforces anonymity

Alias name:
  - font-mono, 12px, var(--text-secondary)
  - NOT bold — it's metadata, not identity

Message text:
  - DM Sans 400, 14.5px, var(--text-primary)
  - Line height: 1.55
  - Max-width: 100% (full width, not bubbles)

Timestamp:
  - font-mono 11px, var(--text-muted)
  - Shown inline after alias name with bullet separator

Hover state:
  - Subtle background: var(--bg-elevated)
  - Reaction bar slides in from right: [😂] [❤️] [👍] [+]
  - Reaction bar uses Framer Motion: x: 8 → 0, opacity: 0 → 1, duration 0.15s

Reactions on message:
  - Small pill: emoji + count
  - Background: var(--bg-elevated), border: var(--border)
  - On click: increment count (anonymous, no user tracked)
```

### MessageInput

```
Container:
  - Background: var(--bg-surface)
  - Border-top: 1px solid var(--border)
  - Padding: 16px 24px

Input field:
  - Background: var(--bg-elevated)
  - Border: 1px solid var(--border)
  - Border-radius: var(--radius-md)
  - Padding: 14px 16px
  - Font: DM Sans 400, 14.5px
  - Color: var(--text-primary)
  - Placeholder: var(--text-muted), "Say something..."
  - On focus: border-color: var(--border-strong), subtle box-shadow: 0 0 0 3px var(--accent-dim)
  - Auto-resize as user types (textarea, not input)
  - Max height: 160px before scrolling

Send button:
  - Right side of input row
  - 36px × 36px circle
  - Background: var(--accent), icon color: #000
  - Disabled (empty input): opacity 0.3
  - On press: scale(0.92) → scale(1), 120ms ease

Keyboard: Cmd/Ctrl+Enter OR Enter to send (make this configurable in settings)

Typing indicator:
  - Below input, 28px tall area
  - "Grey Wolf is typing..." in font-mono 11px var(--text-muted)
  - Three animated dots (CSS keyframes, staggered bounce)
  - Fades in/out with Framer Motion
```

### Members Panel

```
Background: var(--bg-surface)
Border-left: 1px solid var(--border)
Width: 280px

Header:
  - "Members" label: Syne 700, 13px, letter-spacing 0.08em, uppercase
  - Count badge: font-mono 11px, var(--text-muted)

Member cards:
  - Padding: 8px 16px
  - Layout: avatar (32px) + name + joined date
  - Avatar: real profile picture (this is the public side — actual identity visible)
  - Name: DM Sans 500, 14px, var(--text-primary)
  - Joined: font-mono 11px, var(--text-muted), "joined 3d ago"
  - Online indicator: 8px circle, green (#22c55e), positioned bottom-right of avatar
  - Hover: background var(--bg-hover), border-radius var(--radius-sm)

Intentional contrast note:
  The member panel shows REAL names and avatars.
  The chat shows ONLY aliases and colored circles.
  This contrast is the product's core tension — make it visually clear.
  Consider a subtle divider or label between the two areas noting "Chat is anonymous"
```

### Group Header

```
Background: var(--bg-surface)
Border-bottom: 1px solid var(--border)
Height: 56px, padding: 0 24px

Left: Group name in Syne 700, 16px
Right: 
  - Member count chip: font-mono 12px, var(--text-muted), icon + number
  - Invite button: ghost, var(--accent) text, copy icon
  - Members panel toggle button (on mobile)
```

### Home Page (Group List)

```
Background: var(--bg-base)
Centered content, max-width 720px

Header:
  - "Your Rooms" in Syne 800, 32px
  - Subtitle: DM Sans 400, 15px, var(--text-secondary)

Group cards (grid 2-col on desktop, 1-col mobile):
  - Background: var(--bg-surface)
  - Border: var(--border)
  - Border-radius: var(--radius-lg)
  - Padding: 20px
  - Hover: border-color var(--border-strong), translate Y -2px (Framer Motion)
  - Group name: Syne 700, 18px
  - Description: DM Sans 400, 13px, var(--text-secondary), 2 lines max
  - Footer: member count + last activity timestamp, font-mono 12px

Empty state:
  - Large centered illustration (SVG — abstract geometric, monochrome)
  - "No rooms yet" in Syne 700, 20px
  - "Create one or join with an invite link" in DM Sans, var(--text-secondary)
  - Two CTA buttons side by side
```

### Auth Pages (Login / Register)

```
Layout: centered card on dark background
Background: var(--bg-base) with a large blurred radial gradient blob — accent color at 5% opacity, 600px diameter, positioned top-right

Card:
  - Background: var(--bg-surface)
  - Border: var(--border)
  - Border-radius: var(--radius-lg)
  - Padding: 40px
  - Width: 400px

App name above card: Syne 800, 22px, accent color

Form fields:
  - Same style as MessageInput (elevated bg, subtle border, focus glow)
  - Label: DM Sans 500, 13px, var(--text-secondary), margin-bottom 6px

Primary button:
  - Full width
  - Background: var(--accent)
  - Color: #000
  - Font: DM Sans 600, 14px
  - Border-radius: var(--radius-sm)
  - Height: 44px
  - Hover: brightness(1.1)
  - Loading state: spinner replaces text

Google OAuth button:
  - Ghost style: border var(--border-strong), text var(--text-primary)
  - Google icon on left
```

### Join Page (Invite Landing)

```
Full-page centered layout
Large group name in Syne 800, 36px
Member count and description below
"Join Room" CTA button — accent background, large (52px height)
List of 3–5 member avatars stacked (overlapping circles) as social proof

If not logged in: show login form inline before joining
```

---

## Animations & Interactions (Framer Motion)

### Message Entrance
```tsx
// Each new message animates in
<motion.div
  initial={{ opacity: 0, y: 6 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2, ease: 'easeOut' }}
>
```

### Page Transitions
```tsx
// Wrap pages in:
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  transition={{ duration: 0.15 }}
>
```

### Sidebar Group Item
```tsx
// Active indicator bar
<motion.div
  layoutId="active-group-indicator"
  className="absolute left-0 w-0.5 h-5 bg-accent rounded-full"
/>
// Use layoutId to animate the bar sliding between groups
```

### Scroll-to-Bottom Pill
```tsx
// Appears when scrolled up, new messages arrive
<AnimatePresence>
  {showScrollPill && (
    <motion.button
      initial={{ opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.9 }}
      transition={{ duration: 0.18 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 ..."
    >
      ↓ New messages
    </motion.button>
  )}
</AnimatePresence>
```

### Reaction Bar on Hover
```tsx
<motion.div
  initial={{ opacity: 0, x: 8 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: 8 }}
  transition={{ duration: 0.15 }}
>
```

---

## Database Schema

Run this in the Supabase SQL editor.

```sql
-- Profiles (auto-created on signup via trigger)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- Groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  invite_code text unique not null default substr(md5(random()::text), 1, 10),
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

-- Memberships (public — visible in member list)
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- Messages — NO sender_id column. Anonymity enforced at schema level.
create table messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references groups(id) on delete cascade,
  content text not null,
  alias text not null,         -- ephemeral session alias e.g. "Grey Wolf"
  sent_at timestamptz default now()
);

-- Reactions (also anonymous)
create table reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  emoji text not null,
  count int default 1
);
```

### Row Level Security

```sql
alter table profiles enable row level security;
create policy "profiles_read" on profiles for select using (true);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

alter table groups enable row level security;
create policy "groups_read" on groups for select using (
  exists (select 1 from group_members where group_id = id and user_id = auth.uid())
);

alter table group_members enable row level security;
create policy "members_read" on group_members for select using (
  exists (select 1 from group_members gm where gm.group_id = group_id and gm.user_id = auth.uid())
);

alter table messages enable row level security;
create policy "messages_read" on messages for select using (
  exists (select 1 from group_members where group_id = messages.group_id and user_id = auth.uid())
);
-- NO insert policy — all inserts go through the backend server only
```

---

## Backend — Express + Socket.IO

### Entry Point (`server/src/index.ts`)

```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import groupRoutes from './routes/groups';
import memberRoutes from './routes/members';
import { initSocket } from './socket';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL, credentials: true }
});

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.use('/api/groups', groupRoutes);
app.use('/api/members', memberRoutes);

initSocket(io);

httpServer.listen(process.env.PORT || 4000);
```

### Auth Middleware (`server/src/middleware/authenticate.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';
import { Request, Response, NextFunction } from 'express';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });

  req.user = data.user;
  next();
}
```

### Socket Handler (`server/src/socket/handlers.ts`)

```typescript
import { Server, Socket } from 'socket.io';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const ALIASES = [
  'Red Panda', 'Blue Whale', 'Grey Wolf', 'Silver Fox', 'Black Bear',
  'Amber Tiger', 'Jade Serpent', 'Ivory Crane', 'Crimson Hawk', 'Teal Otter',
  'Onyx Raven', 'Pearl Deer', 'Cobalt Lynx', 'Rust Falcon', 'Dusk Heron',
  // add 100+ more for variety
];

function randomAlias() {
  return ALIASES[Math.floor(Math.random() * ALIASES.length)];
}

export function initSocket(io: Server) {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return next(new Error('Invalid token'));

    socket.data.userId = data.user.id;
    socket.data.alias = randomAlias(); // ephemeral — lives in memory only
    next();
  });

  io.on('connection', (socket: Socket) => {

    socket.on('join_group', async (groupId: string) => {
      const { data } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', socket.data.userId)
        .single();

      if (!data) return socket.emit('error', 'Not a member');
      socket.join(groupId);
    });

    socket.on('send_message', async ({ groupId, content }: { groupId: string; content: string }) => {
      const { data: member } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId)
        .eq('user_id', socket.data.userId)
        .single();

      if (!member) return socket.emit('error', 'Not a member');

      const sanitized = content.trim().slice(0, 1000);
      if (!sanitized) return;

      const { data: message, error } = await supabase
        .from('messages')
        .insert({ group_id: groupId, content: sanitized, alias: socket.data.alias })
        .select()
        .single();

      if (error) return socket.emit('error', 'Failed to send');

      // Broadcast — no identity, only alias
      io.to(groupId).emit('new_message', {
        id: message.id,
        content: message.content,
        alias: message.alias,
        sent_at: message.sent_at,
      });
    });

    // Typing indicator — alias only, never userId
    socket.on('typing_start', ({ groupId }: { groupId: string }) => {
      socket.to(groupId).emit('user_typing', { alias: socket.data.alias });
    });

    socket.on('typing_stop', ({ groupId }: { groupId: string }) => {
      socket.to(groupId).emit('user_stopped_typing', { alias: socket.data.alias });
    });
  });
}
```

---

## Group Routes (`server/src/routes/groups.ts`)

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { supabase } from '../lib/supabase';

const router = Router();

router.post('/', authenticate, async (req, res) => {
  const { name, description } = req.body;
  const { data, error } = await supabase
    .from('groups')
    .insert({ name, description, created_by: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ error });

  await supabase.from('group_members').insert({ group_id: data.id, user_id: req.user.id });
  res.json(data);
});

router.post('/join/:inviteCode', authenticate, async (req, res) => {
  const { inviteCode } = req.params;

  const { data: group } = await supabase
    .from('groups')
    .select('id')
    .eq('invite_code', inviteCode)
    .single();

  if (!group) return res.status(404).json({ error: 'Invalid invite' });

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: req.user.id });

  if (error?.code === '23505') return res.status(200).json({ message: 'Already a member', group });

  res.json({ message: 'Joined', group });
});

router.get('/', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('group_members')
    .select('group_id, groups(*)')
    .eq('user_id', req.user.id);

  res.json(data?.map(d => d.groups) ?? []);
});

router.get('/:groupId/messages', authenticate, async (req, res) => {
  const { groupId } = req.params;
  const { before, limit = 50 } = req.query;

  const { data: member } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', req.user.id)
    .single();

  if (!member) return res.status(403).json({ error: 'Not a member' });

  let query = supabase
    .from('messages')
    .select('id, content, alias, sent_at')
    .eq('group_id', groupId)
    .order('sent_at', { ascending: false })
    .limit(Number(limit));

  if (before) query = query.lt('sent_at', before);

  const { data } = await query;
  res.json(data ?? []);
});

export default router;
```

---

## Frontend

### Socket Store (`client/src/lib/socket.ts`)

```typescript
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SERVER_URL, {
      auth: { token },
      autoConnect: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
```

### Chat Store (`client/src/store/chatStore.ts`)

```typescript
import { create } from 'zustand';

interface Message {
  id: string;
  content: string;
  alias: string;
  sent_at: string;
}

interface ChatStore {
  messages: Record<string, Message[]>;
  typingAliases: Record<string, string[]>;
  addMessage: (groupId: string, message: Message) => void;
  setMessages: (groupId: string, messages: Message[]) => void;
  setTyping: (groupId: string, alias: string, isTyping: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: {},
  typingAliases: {},
  addMessage: (groupId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [groupId]: [...(state.messages[groupId] ?? []), message],
      },
    })),
  setMessages: (groupId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [groupId]: messages },
    })),
  setTyping: (groupId, alias, isTyping) =>
    set((state) => {
      const current = state.typingAliases[groupId] ?? [];
      return {
        typingAliases: {
          ...state.typingAliases,
          [groupId]: isTyping
            ? [...new Set([...current, alias])]
            : current.filter((a) => a !== alias),
        },
      };
    }),
}));
```

### useSocket Hook (`client/src/hooks/useSocket.ts`)

```typescript
import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';

export function useSocket(groupId: string) {
  const token = useAuthStore((s) => s.token);
  const { addMessage, setTyping } = useChatStore();
  const typingTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    socket.emit('join_group', groupId);
    socket.on('new_message', (message) => addMessage(groupId, message));
    socket.on('user_typing', ({ alias }) => setTyping(groupId, alias, true));
    socket.on('user_stopped_typing', ({ alias }) => setTyping(groupId, alias, false));

    return () => {
      socket.off('new_message');
      socket.off('user_typing');
      socket.off('user_stopped_typing');
    };
  }, [groupId, token]);

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

  return { sendMessage, sendTyping };
}
```

### Alias Color Utility (`client/src/lib/aliasColor.ts`)

```typescript
// Deterministic color from alias string — same alias always gets same color
const PALETTE = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#06b6d4', '#f97316', '#6366f1',
];

export function aliasColor(alias: string): string {
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function aliasInitials(alias: string): string {
  return alias.split(' ').map((w) => w[0]).join('').toUpperCase();
}
```

---

## Invite Link Flow

1. Group creator calls `GET /api/groups/:id` — response includes `invite_code`
2. Share link: `https://yourapp.com/join/:invite_code`
3. User opens link → `Join.tsx` renders group preview with member count + stacked avatars
4. If not logged in → inline login form → after auth, auto-completes join
5. `Join.tsx` calls `POST /api/groups/join/:inviteCode`
6. On success → Framer Motion transition into `/chat/:groupId`

---

## Environment Variables

### Server `.env`
```
PORT=4000
CLIENT_URL=https://yourapp.vercel.app
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # service role key — never expose to client
```

### Client `.env`
```
VITE_SERVER_URL=https://yourserver.railway.app
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # anon key only
```

---

## Key Implementation Rules

### Anonymity Rules
- The `messages` table has **no `sender_id` column** — enforced at schema level
- All message inserts happen **server-side only** — no direct Supabase insert from client
- The JWT is used only to verify group membership, then discarded
- Aliases are generated on socket connect, stored **in memory only**, never persisted
- Alias resets on page refresh — new session, new alias
- Typing indicators emit alias only — never userId

### Security Rules
- Rate limit message sends: 10 messages per 10 seconds per socket
- Sanitize content: trim whitespace, strip HTML, max 1000 characters
- Verify group membership on **every** message event, not just socket connect
- Use Supabase service role key only on the server, never in the client bundle
- RLS policies ensure clients can't directly read groups or messages they're not members of

### Real-time Rules
- Socket rooms are named by `groupId`
- On reconnect, client re-emits `join_group` with the current groupId
- Load last 50 messages via REST on page load, then stream new ones via Socket.IO

### UI Rules
- Use Framer Motion for ALL transitions and micro-interactions — no CSS-only animations except typing dots
- Never use chat bubbles — use full-width row layout (Discord/Slack style)
- Alias circles must use `aliasColor()` utility — consistent color per alias
- Member panel shows real avatars and names — this is intentional contrast with the anonymous chat
- No gradient on navigation chrome — gradients only for background atmospheric blobs
- All spacing in multiples of 4px
- All interactive elements must have hover AND focus states (keyboard accessibility)

---

## Feature Checklist

- [ ] Auth (email + Google OAuth via Supabase)
- [ ] Create group
- [ ] Join via invite link (with preview page)
- [ ] Public member list with real avatars
- [ ] Anonymous chat with ephemeral aliases + colored alias circles
- [ ] Message grouping (same alias, within 5 min)
- [ ] Typing indicators (alias-only)
- [ ] Reactions (anonymous, emoji + count)
- [ ] Scroll-to-bottom pill on new message
- [ ] Message pagination (load older on scroll to top)
- [ ] Regenerate invite link (admin only)
- [ ] Remove member (admin only)
- [ ] Rate limiting on message sends
- [ ] Framer Motion page transitions
- [ ] Mobile responsive (sidebar collapses, members panel toggles)

---

## What NOT to Do

- Do not store `sender_id` anywhere in the messages table — not even in a hidden column
- Do not allow clients to insert messages directly via Supabase client — all inserts go through the Express server
- Do not expose the Supabase service role key to the frontend
- Do not persist aliases to the database — they must be ephemeral
- Do not send the user's profile info alongside messages in any socket event
- Do not use chat bubbles (left/right layout) — use full-width Discord-style rows
- Do not use Inter, Roboto, or system fonts — use Syne + DM Sans + JetBrains Mono
- Do not use purple gradient backgrounds — this is a dark editorial app, not a generic SaaS
- Do not skip Framer Motion — animations are a core part of the experience
- Do not make the alias circles look like real profile pictures — they are colored initials only
