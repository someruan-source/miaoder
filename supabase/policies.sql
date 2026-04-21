alter table public.users enable row level security;
alter table public.pets enable row level security;
alter table public.pet_tags enable row level security;
alter table public.pet_media enable row level security;
alter table public.swipes enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.favorites enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy "users_select_public"
on public.users for select
using (true);

create policy "users_insert_own"
on public.users for insert
with check (auth.uid() = auth_user_id);

create policy "users_update_own"
on public.users for update
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

create policy "pets_select_public"
on public.pets for select
using (true);

create policy "pets_insert_own"
on public.pets for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = pets.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "pets_update_own"
on public.pets for update
using (
  exists (
    select 1 from public.users u
    where u.id = pets.user_id and u.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = pets.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "pets_delete_own"
on public.pets for delete
using (
  exists (
    select 1 from public.users u
    where u.id = pets.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "pet_tags_select_public"
on public.pet_tags for select
using (true);

create policy "pet_tags_write_owner"
on public.pet_tags for all
using (
  exists (
    select 1
    from public.pets p
    join public.users u on u.id = p.user_id
    where p.id = pet_tags.pet_id and u.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pets p
    join public.users u on u.id = p.user_id
    where p.id = pet_tags.pet_id and u.auth_user_id = auth.uid()
  )
);

create policy "pet_media_select_public"
on public.pet_media for select
using (true);

create policy "pet_media_write_owner"
on public.pet_media for all
using (
  exists (
    select 1
    from public.pets p
    join public.users u on u.id = p.user_id
    where p.id = pet_media.pet_id and u.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.pets p
    join public.users u on u.id = p.user_id
    where p.id = pet_media.pet_id and u.auth_user_id = auth.uid()
  )
);

create policy "swipes_insert_own"
on public.swipes for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = swipes.from_user_id and u.auth_user_id = auth.uid()
  )
);

create policy "swipes_select_own"
on public.swipes for select
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = auth.uid() and u.id = swipes.from_user_id
  )
);

create policy "matches_select_participants"
on public.matches for select
using (
  exists (
    select 1 from public.users u
    where u.auth_user_id = auth.uid()
      and (u.id = matches.user_a_id or u.id = matches.user_b_id)
  )
);

create policy "messages_select_participants"
on public.messages for select
using (
  exists (
    select 1
    from public.matches m
    join public.users u on u.auth_user_id = auth.uid()
    where m.id = messages.match_id
      and (u.id = m.user_a_id or u.id = m.user_b_id)
  )
);

create policy "messages_insert_participants"
on public.messages for insert
with check (
  exists (
    select 1
    from public.matches m
    join public.users u on u.auth_user_id = auth.uid()
    where m.id = messages.match_id
      and u.id = messages.sender_user_id
      and (u.id = m.user_a_id or u.id = m.user_b_id)
  )
);

create policy "posts_select_published"
on public.posts for select
using (status = 'published');

create policy "posts_insert_own"
on public.posts for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = posts.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "posts_update_own"
on public.posts for update
using (
  exists (
    select 1 from public.users u
    where u.id = posts.user_id and u.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.users u
    where u.id = posts.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "post_media_select_public"
on public.post_media for select
using (true);

create policy "post_media_write_owner"
on public.post_media for all
using (
  exists (
    select 1
    from public.posts p
    join public.users u on u.id = p.user_id
    where p.id = post_media.post_id and u.auth_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.posts p
    join public.users u on u.id = p.user_id
    where p.id = post_media.post_id and u.auth_user_id = auth.uid()
  )
);

create policy "comments_select_published"
on public.comments for select
using (status = 'published');

create policy "comments_insert_own"
on public.comments for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = comments.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "likes_select_own"
on public.likes for select
using (
  exists (
    select 1 from public.users u
    where u.id = likes.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "likes_insert_own"
on public.likes for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = likes.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "likes_delete_own"
on public.likes for delete
using (
  exists (
    select 1 from public.users u
    where u.id = likes.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "favorites_select_own"
on public.favorites for select
using (
  exists (
    select 1 from public.users u
    where u.id = favorites.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "favorites_insert_own"
on public.favorites for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = favorites.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "favorites_delete_own"
on public.favorites for delete
using (
  exists (
    select 1 from public.users u
    where u.id = favorites.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "reports_insert_own"
on public.reports for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = reports.reporter_user_id and u.auth_user_id = auth.uid()
  )
);

create policy "reports_select_own"
on public.reports for select
using (
  exists (
    select 1 from public.users u
    where u.id = reports.reporter_user_id and u.auth_user_id = auth.uid()
  )
);

create policy "blocks_select_own"
on public.blocks for select
using (
  exists (
    select 1 from public.users u
    where u.id = blocks.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "blocks_insert_own"
on public.blocks for insert
with check (
  exists (
    select 1 from public.users u
    where u.id = blocks.user_id and u.auth_user_id = auth.uid()
  )
);

create policy "blocks_delete_own"
on public.blocks for delete
using (
  exists (
    select 1 from public.users u
    where u.id = blocks.user_id and u.auth_user_id = auth.uid()
  )
);
