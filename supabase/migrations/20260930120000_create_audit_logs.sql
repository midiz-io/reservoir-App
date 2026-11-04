create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id),
    action text not null,
    entity_type text not null,
    entity_id uuid,
    details jsonb
);

alter table public.audit_logs enable row level security;

create policy "Super admins can view all audit logs"
    on public.audit_logs
    for select
    using (
        public.has_role(auth.uid(), 'super_admin')
    );
