begin;

-- profile fields cho trang tai khoan/public profile
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text;

update public.profiles
set display_name = 'User'
where display_name is null or btrim(display_name) = '';

alter table public.profiles
  alter column display_name set default 'User',
  alter column display_name set not null;

-- bang bookmark moi theo contract event_bookmarks
create table if not exists public.event_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists idx_event_bookmarks_user on public.event_bookmarks(user_id, created_at desc);
create index if not exists idx_event_bookmarks_event on public.event_bookmarks(event_id);

insert into public.event_bookmarks (user_id, event_id, created_at)
select f.user_id, f.event_id, f.created_at
from public.favorites f
on conflict (user_id, event_id) do nothing;

alter table public.event_bookmarks enable row level security;

drop policy if exists "event_bookmarks own all" on public.event_bookmarks;
create policy "event_bookmarks own all"
on public.event_bookmarks for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- mo rong ai_messages de luu lich su chat dang role/content
do $$
begin
  create type public.ai_message_role as enum ('user', 'assistant');
exception
  when duplicate_object then null;
end $$;

alter table public.ai_messages
  add column if not exists role public.ai_message_role,
  add column if not exists content text;

update public.ai_messages
set role = coalesce(role, 'assistant'::public.ai_message_role),
    content = coalesce(nullif(content, ''), nullif(answer, ''), nullif(question, ''), '')
where role is null
   or content is null
   or content = '';

alter table public.ai_messages
  alter column role set default 'assistant',
  alter column role set not null,
  alter column content set default '',
  alter column content set not null;

create index if not exists idx_ai_messages_user_created_at on public.ai_messages(user_id, created_at desc);
create index if not exists idx_ai_messages_user_role_created_at on public.ai_messages(user_id, role, created_at desc);

-- bucket avatar cho profile user
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars read all" on storage.objects;
create policy "avatars read all"
on storage.objects for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars own write" on storage.objects;
create policy "avatars own write"
on storage.objects for all
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
