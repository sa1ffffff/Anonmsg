create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references profiles(id),
  invite_code text unique not null default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz default now()
);

create table if not exists group_members (
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  content text not null,
  alias text not null,
  sent_at timestamptz default now()
);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages(id) on delete cascade,
  emoji text not null,
  count integer not null default 1,
  unique (message_id, emoji)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table profiles enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table messages enable row level security;
alter table reactions enable row level security;

create policy "profiles_read" on profiles
for select using (true);

create policy "profiles_insert" on profiles
for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
for update using (auth.uid() = id);

create policy "groups_read" on groups
for select using (
  exists (
    select 1 from group_members gm
    where gm.group_id = id and gm.user_id = auth.uid()
  )
);

create policy "group_members_read" on group_members
for select using (
  exists (
    select 1 from group_members gm
    where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
  )
);

create policy "messages_read" on messages
for select using (
  exists (
    select 1 from group_members gm
    where gm.group_id = messages.group_id and gm.user_id = auth.uid()
  )
);

create policy "reactions_read" on reactions
for select using (
  exists (
    select 1
    from messages m
    join group_members gm on gm.group_id = m.group_id
    where m.id = reactions.message_id and gm.user_id = auth.uid()
  )
);
