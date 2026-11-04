-- Create the audit trigger function
create or replace function public.process_audit_log()
returns trigger as $$
declare
    v_user_id uuid;
begin
    -- Try to get the user ID from auth.uid()
    begin
        v_user_id := auth.uid();
    exception
        when others then
            v_user_id := null;
    end;

    if (TG_OP = 'INSERT') then
        insert into public.audit_logs (action, entity_type, entity_id, details, user_id)
        values ('INSERT', TG_TABLE_NAME, (new.id)::uuid, row_to_json(new)::jsonb, v_user_id);
        return new;
    elsif (TG_OP = 'UPDATE') then
        insert into public.audit_logs (action, entity_type, entity_id, details, user_id)
        values ('UPDATE', TG_TABLE_NAME, (new.id)::uuid, jsonb_build_object('old', row_to_json(old)::jsonb, 'new', row_to_json(new)::jsonb), v_user_id);
        return new;
    elsif (TG_OP = 'DELETE') then
        insert into public.audit_logs (action, entity_type, entity_id, details, user_id)
        values ('DELETE', TG_TABLE_NAME, (old.id)::uuid, row_to_json(old)::jsonb, v_user_id);
        return old;
    end if;
    return null;
end;
$$ language plpgsql security definer;

-- Helper macro to create triggers for tables
do $$
declare
    t text;
    tables text[] := array[
        'profiles',
        'user_roles',
        'locations',
        'reservoirs',
        'employees',
        'data_entries',
        'employee_locations',
        'admin_locations',
        'association_bills',
        'suppliers',
        'price_catalog',
        'fisheries_associations'
    ];
begin
    foreach t in array tables loop
        execute format('
            drop trigger if exists audit_%I_trigger on public.%I;
            create trigger audit_%I_trigger
            after insert or update or delete on public.%I
            for each row execute function public.process_audit_log();
        ', t, t, t, t);
    end loop;
end;
$$;
