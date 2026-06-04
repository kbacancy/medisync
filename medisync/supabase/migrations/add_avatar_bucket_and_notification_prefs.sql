-- Add notification_prefs column to profiles
alter table profiles
  add column if not exists notification_prefs jsonb not null default '{
    "email_alerts": true,
    "push_alerts": true,
    "ddi_warnings": true,
    "critical_alerts": true,
    "appointment_reminders": true,
    "schedule_changes": false,
    "system_updates": true,
    "maintenance": false
  }'::jsonb;

-- Create avatars storage bucket (public so img src URLs work without auth)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage RLS policies (guarded against duplicates via DO blocks)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatar_upload'
  ) then
    create policy "avatar_upload"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatar_update'
  ) then
    create policy "avatar_update"
      on storage.objects for update
      to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatar_public_read'
  ) then
    create policy "avatar_public_read"
      on storage.objects for select
      to public
      using (bucket_id = 'avatars');
  end if;
end $$;
