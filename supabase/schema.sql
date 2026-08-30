-- Endgame Trainer sync schema (spec §11). Apply via the Supabase SQL editor.
create table progress (
  user_id uuid references auth.users not null,
  item_id text not null,            -- position id or principle-card id
  kind text not null default 'position',
  attempts int not null default 0,
  solved int not null default 0,
  ease real not null default 2.5,
  interval_days int not null default 0,
  lapses int not null default 0,
  last_seen date,
  next_due date,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table lesson_reads (
  user_id uuid references auth.users not null,
  lesson_id text not null,
  read_at date not null,
  primary key (user_id, lesson_id)
);

create table games (
  -- Composite key: game ids are deterministic per-date strings
  -- (g-YYYY-MM-DD-NN), so two accounts would collide on a bare id pk.
  id text not null,
  user_id uuid references auth.users not null,
  data jsonb not null,           -- full game object from the OTB addendum
  updated_at timestamptz not null default now(),
  deleted boolean not null default false,
  primary key (user_id, id)
);

alter table progress enable row level security;
alter table lesson_reads enable row level security;
alter table games enable row level security;
create policy "own rows" on progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on lesson_reads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on games for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
