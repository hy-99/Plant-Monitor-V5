create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text unique,
  email text unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

alter table users add column if not exists username text;
alter table users alter column email drop not null;
create unique index if not exists users_username_key on users(username) where username is not null;

create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id) on delete cascade,
  image_data_url text,
  image_path text,
  image_size_bytes integer,
  image_mime_type text,
  image_sha256 text,
  summary text,
  analysis jsonb not null,
  timestamp timestamptz not null default now()
);

alter table snapshots alter column image_data_url drop not null;
alter table snapshots add column if not exists image_path text;
alter table snapshots add column if not exists image_size_bytes integer;
alter table snapshots add column if not exists image_mime_type text;
alter table snapshots add column if not exists image_sha256 text;

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plant_id uuid references plants(id) on delete set null,
  title text not null,
  notes text,
  due_at timestamptz not null,
  recurrence text not null default 'none',
  completed_at timestamptz,
  last_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plant_id uuid references plants(id) on delete set null,
  role text not null check (role in ('user', 'assistant')),
  mode text not null check (mode in ('plant', 'casual', 'web')),
  content text not null,
  sources jsonb,
  created_at timestamptz not null default now()
);

create index if not exists plants_user_id_idx on plants(user_id);
create index if not exists snapshots_plant_id_idx on snapshots(plant_id);
create index if not exists reminders_user_id_idx on reminders(user_id);
create index if not exists reminders_due_at_idx on reminders(due_at);
create index if not exists chat_messages_user_scope_idx on chat_messages(user_id, plant_id, created_at);
