create table public.chaos_settings (
  user_id uuid references auth.users(id) on delete cascade primary key,
  logout_loop boolean default false not null,
  flicker_page boolean default false not null,
  virus_load boolean default false not null,
  slow_mode boolean default false not null,
  clear_logs boolean default false not null,
  crazy_bugs boolean default false not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on RLS
alter table public.chaos_settings enable row level security;

-- Policies

-- Everyone can read their own chaos settings
create policy "Users can read own chaos settings"
  on public.chaos_settings
  for select
  using (auth.uid() = user_id);

-- Super admins can do anything to this table
create policy "Super admins can manage all chaos settings"
  on public.chaos_settings
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
      and user_roles.role = 'super_admin'
    )
  );

-- Create a trigger to update the updated_at column
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_chaos_settings_updated_at
before update on public.chaos_settings
for each row
execute function public.handle_updated_at();

-- Insert replica identity full so realtime gets full old/new rows (useful for debugging, though default is okay too)
alter table public.chaos_settings replica identity full;
