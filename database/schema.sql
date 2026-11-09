-- StudyFlow: ЧЕРНОВА за Етап 2 (НЕ Е изпълнявана в Supabase).
-- Прегледайте я и я тествайте в собствен проект, преди да я приемете за готова.
-- Включва 5 свързани таблици, ограничения и базови RLS политики.

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default '',
    created_at timestamptz not null default now()
);

create table if not exists public.subjects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null check (char_length(trim(name)) between 1 and 60),
    color text not null default '#7358db',
    unique (id, user_id),
    unique (user_id, name)
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

-- Регистрацията ще създава профил автоматично. Прегледайте и тествайте тригера.
create or replace function public.create_studyflow_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    insert into public.profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', ''))
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_studyflow_user_created on auth.users;
create trigger on_studyflow_user_created
    after insert on auth.users for each row execute procedure public.create_studyflow_profile();

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.tasks enable row level security;
alter table public.reminders enable row level security;
alter table public.task_tags enable row level security;

-- Потребителят има достъп само до собствените редове.
-- Профилите използват id = auth.uid(), другите таблици — user_id = auth.uid().
create policy "own profiles select" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profiles update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own subjects select" on public.subjects for select to authenticated using (user_id = (select auth.uid()));
create policy "own subjects insert" on public.subjects for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own subjects update" on public.subjects for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own subjects delete" on public.subjects for delete to authenticated using (user_id = (select auth.uid()));

create policy "own tasks select" on public.tasks for select to authenticated using (user_id = (select auth.uid()));
create policy "own tasks insert" on public.tasks for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own tasks update" on public.tasks for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tasks delete" on public.tasks for delete to authenticated using (user_id = (select auth.uid()));

create policy "own reminders select" on public.reminders for select to authenticated using (user_id = (select auth.uid()));
create policy "own reminders insert" on public.reminders for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own reminders update" on public.reminders for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own reminders delete" on public.reminders for delete to authenticated using (user_id = (select auth.uid()));

create policy "own tags select" on public.task_tags for select to authenticated using (user_id = (select auth.uid()));
create policy "own tags insert" on public.task_tags for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own tags update" on public.task_tags for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own tags delete" on public.task_tags for delete to authenticated using (user_id = (select auth.uid()));

-- Важно за Етап 2: проверете в Supabase, че достъпът до чужд user_id е отказан.
