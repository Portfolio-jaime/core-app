-- ─── Ejecuta este script en el SQL Editor de tu proyecto Supabase ─────────────

-- Perfiles de usuario (extiende auth.users)
create table if not exists public.profiles (
  id           uuid references auth.users on delete cascade primary key,
  name         text,
  age          int,
  height_cm    int,
  weight_kg    numeric(5,1),
  condition    text default 'general',
  program_start_date date default current_date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- Hábitos diarios
create table if not exists public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  date         date not null,
  data         jsonb not null default '{}',
  created_at   timestamptz default now(),
  unique(user_id, date)
);

-- Registros semanales de progreso
create table if not exists public.weekly_records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  week         int not null check (week between 1 and 12),
  weight_kg    numeric(5,1),
  waist_cm     numeric(5,1),
  energy_level int check (energy_level between 1 and 5),
  lumbar_pain  int check (lumbar_pain between 1 and 5),
  notes        text,
  recorded_at  timestamptz default now(),
  unique(user_id, week)
);

-- Sesiones de natación
create table if not exists public.swimming_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users on delete cascade not null,
  date         date not null,
  duration_min int,
  total_meters int,
  notes        text,
  created_at   timestamptz default now()
);

-- ─── Row Level Security ────────────────────────────────────────────────────────
alter table public.profiles        enable row level security;
alter table public.habits          enable row level security;
alter table public.weekly_records  enable row level security;
alter table public.swimming_sessions enable row level security;

-- Políticas: cada usuario solo ve y modifica sus propios datos
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

create policy "habits_own" on public.habits
  for all using (auth.uid() = user_id);

create policy "weekly_records_own" on public.weekly_records
  for all using (auth.uid() = user_id);

create policy "swimming_own" on public.swimming_sessions
  for all using (auth.uid() = user_id);

-- ─── Trigger: crear perfil automáticamente al registrarse ─────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, age, height_cm, weight_kg, condition, program_start_date)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name',
    (new.raw_user_meta_data ->> 'age')::int,
    (new.raw_user_meta_data ->> 'height_cm')::int,
    (new.raw_user_meta_data ->> 'weight_kg')::numeric,
    coalesce(new.raw_user_meta_data ->> 'condition', 'general'),
    coalesce((new.raw_user_meta_data ->> 'program_start_date')::date, current_date)
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
