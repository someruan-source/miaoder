create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique,
  phone text,
  nickname text not null,
  avatar_url text,
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cat','dog','other')),
  breed text,
  gender text check (gender in ('male','female','unknown')),
  age_months int,
  size text check (size in ('small','medium','large')),
  neutered boolean not null default false,
  vaccinated boolean not null default false,
  friendly_to_humans boolean,
  friendly_to_pets boolean,
  meetup_ready boolean not null default false,
  intro text,
  city text,
  district text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pet_tags (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  tag_type text not null check (tag_type in ('personality','activity')),
  tag_value text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.pet_media (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.swipes (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references public.users(id) on delete cascade,
  from_pet_id uuid not null references public.pets(id) on delete cascade,
  to_pet_id uuid not null references public.pets(id) on delete cascade,
  action text not null check (action in ('like','skip')),
  created_at timestamptz not null default now(),
  unique (from_pet_id, to_pet_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  pet_a_id uuid not null references public.pets(id) on delete cascade,
  pet_b_id uuid not null references public.pets(id) on delete cascade,
  user_a_id uuid not null references public.users(id) on delete cascade,
  user_b_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active','blocked','deleted')),
  created_at timestamptz not null default now(),
  unique (pet_a_id, pet_b_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  category text not null check (category in ('experience','diet','training','help','emergency','city')),
  title text not null,
  content text not null,
  city text,
  is_city_visible boolean not null default true,
  status text not null default 'published' check (status in ('published','hidden','deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  media_type text not null check (media_type in ('image','video')),
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  status text not null default 'published' check (status in ('published','hidden','deleted')),
  created_at timestamptz not null default now()
);

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('post','comment')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, post_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.users(id) on delete cascade,
  target_type text not null check (target_type in ('user','pet','post','comment','message')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','reviewing','resolved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  blocked_user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, blocked_user_id)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_pets_updated_at on public.pets;
create trigger set_pets_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

create index if not exists idx_pets_user_id on public.pets(user_id);
create index if not exists idx_pets_city on public.pets(city);
create index if not exists idx_swipes_from_pet_id on public.swipes(from_pet_id);
create index if not exists idx_swipes_to_pet_id on public.swipes(to_pet_id);
create index if not exists idx_matches_user_a_id on public.matches(user_a_id);
create index if not exists idx_matches_user_b_id on public.matches(user_b_id);
create index if not exists idx_messages_match_id on public.messages(match_id);
create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_category on public.posts(category);
create index if not exists idx_comments_post_id on public.comments(post_id);
create index if not exists idx_reports_status on public.reports(status);
