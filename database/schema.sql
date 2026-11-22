-- StudyFlow / Етап 2 • Изпълнете в Supabase SQL Editor веднъж.
-- Подготвена SQL схема; създаването във вашия акаунт трябва да се потвърди отделно.
-- Таблици: profiles → subjects → tasks → reminders / task_tags.
-- RLS: само удостоверени потребители имат достъп до СОБСТВЕНИТЕ си записи.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  color text not null default '#7358db',
  unique (user_id, name),
  unique (id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 100),
  description text not null default '',
  due_date date not null,
  priority smallint not null default 2 check (priority between 1 and 3),
  estimated_minutes integer not null default 30 check (estimated_minutes between 1 and 1440),
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects(id, user_id)
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null,
  remind_at timestamptz not null,
  is_sent boolean not null default false,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);

create table if not exists public.task_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null,
  label text not null check (char_length(trim(label)) between 1 and 30),
  unique (task_id, label),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);

create index if not exists idx_tasks_user_due on public.tasks(user_id, due_date);
create index if not exists idx_subjects_user on public.subjects(user_id);

-- Автоматично се създава празен профил за всеки нов акаунт.
create or replace function public.create_studyflow_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, 'Student') on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_studyflow_user_created on auth.users;
create trigger on_studyflow_user_created
  after insert on auth.users for each row
  execute function public.create_studyflow_profile();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.task_tags enable row level security;

-- Профил: собственикът чете/добавя/редактира само собствения си ред.
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Предмети: достъп само до собствените записи.
drop policy if exists "subjects_select_own" on public.subjects;
drop policy if exists "subjects_insert_own" on public.subjects;
drop policy if exists "subjects_update_own" on public.subjects;
drop policy if exists "subjects_delete_own" on public.subjects;
create policy "subjects_select_own" on public.subjects for select to authenticated using (user_id = (select auth.uid()));
create policy "subjects_insert_own" on public.subjects for insert to authenticated with check (user_id = (select auth.uid()));
create policy "subjects_update_own" on public.subjects for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "subjects_delete_own" on public.subjects for delete to authenticated using (user_id = (select auth.uid()));

-- Задачи: комбинираният FK гарантира, че предметът принадлежи на същия ученик.
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select to authenticated using (user_id = (select auth.uid()));
create policy "tasks_insert_own" on public.tasks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tasks_update_own" on public.tasks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tasks_delete_own" on public.tasks for delete to authenticated using (user_id = (select auth.uid()));

-- Подготвени за следващите етапи: напомняния и етикети.
drop policy if exists "reminders_select_own" on public.reminders;
drop policy if exists "reminders_insert_own" on public.reminders;
drop policy if exists "reminders_update_own" on public.reminders;
drop policy if exists "reminders_delete_own" on public.reminders;
create policy "reminders_select_own" on public.reminders for select to authenticated using (user_id = (select auth.uid()));
create policy "reminders_insert_own" on public.reminders for insert to authenticated with check (user_id = (select auth.uid()));
create policy "reminders_update_own" on public.reminders for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reminders_delete_own" on public.reminders for delete to authenticated using (user_id = (select auth.uid()));

drop policy if exists "tags_select_own" on public.task_tags;
drop policy if exists "tags_insert_own" on public.task_tags;
drop policy if exists "tags_update_own" on public.task_tags;
drop policy if exists "tags_delete_own" on public.task_tags;
create policy "tags_select_own" on public.task_tags for select to authenticated using (user_id = (select auth.uid()));
create policy "tags_insert_own" on public.task_tags for insert to authenticated with check (user_id = (select auth.uid()));
create policy "tags_update_own" on public.task_tags for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "tags_delete_own" on public.task_tags for delete to authenticated using (user_id = (select auth.uid()));

-- Постоянно важи RLS; без публични разрешения за анонимни посетители.
revoke all on public.profiles, public.subjects, public.tasks, public.reminders, public.task_tags from anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.subjects, public.tasks, public.reminders, public.task_tags to authenticated;
