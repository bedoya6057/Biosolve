-- Create the complete bucket
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

-- Set up RLS policies for the photos bucket
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'photos' );

create policy "Auth Upload"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'photos' );

create policy "Auth Update"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'photos' );

create policy "Auth Delete"
  on storage.objects for delete
  to authenticated
  using ( bucket_id = 'photos' );
