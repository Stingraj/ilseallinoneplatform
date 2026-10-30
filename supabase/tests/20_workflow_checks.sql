-- Behavioural checks for 20261030000000_studio_workflows.sql. Runs after 10_rls_checks.sql (owner/stranger exist).
\set ON_ERROR_STOP on
insert into public.artworks (id, title, status, is_public) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Order A', 'Available', true),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Order B', 'Available', true),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Order C', 'Private', false);

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare v_id uuid; v_at timestamptz; v_order text; v_at2 timestamptz;
begin
  -- create with order C, A, B (+ a duplicate A that must be ignored)
  select exhibition_id, saved_at into v_id, v_at from public.save_exhibition(null, null,
    '{"title":"Spring","start_date":"2027-03-01","end_date":"2027-04-01"}'::jsonb,
    array['bbbbbbbb-0000-0000-0000-000000000003','bbbbbbbb-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000001']::uuid[]);
  select string_agg(w.title, ',' order by ea.position) into v_order from public.exhibition_artworks ea join public.artworks w on w.id = ea.artwork_id where ea.exhibition_id = v_id;
  if v_order <> 'Order C,Order A,Order B' then raise exception 'order not saved: %', v_order; end if;
  if (select is_published from public.exhibitions where id = v_id) then raise exception 'new exhibition must not be published'; end if;

  -- a failing save (unknown artwork) leaves the previous membership intact
  begin
    perform public.save_exhibition(v_id, v_at, '{"title":"Spring"}'::jsonb, array['bbbbbbbb-0000-0000-0000-000000000002','99999999-0000-0000-0000-000000000000']::uuid[]);
    raise exception 'unknown artwork accepted';
  exception when invalid_parameter_value then null;
  end;
  if (select count(*) from public.exhibition_artworks where exhibition_id = v_id) <> 3 then raise exception 'failed save changed membership'; end if;

  -- bad dates rejected
  begin
    perform public.save_exhibition(v_id, v_at, '{"title":"Spring","start_date":"2027-05-01","end_date":"2027-04-01"}'::jsonb, '{}'::uuid[]);
    raise exception 'end before start accepted';
  exception when invalid_parameter_value then null;
  end;

  -- reorder succeeds with the current revision...
  select saved_at into v_at2 from public.save_exhibition(v_id, v_at, '{"title":"Spring"}'::jsonb,
    array['bbbbbbbb-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000001']::uuid[]);
  select string_agg(w.title, ',' order by ea.position) into v_order from public.exhibition_artworks ea join public.artworks w on w.id = ea.artwork_id where ea.exhibition_id = v_id;
  if v_order <> 'Order B,Order A' then raise exception 'reorder failed: %', v_order; end if;
  -- ...and a second tab still holding the old revision is rejected
  begin
    perform public.save_exhibition(v_id, v_at, '{"title":"Overwritten"}'::jsonb, '{}'::uuid[]);
    raise exception 'stale edit accepted';
  exception when serialization_failure then null;
  end;
  if (select title from public.exhibitions where id = v_id) <> 'Spring' then raise exception 'stale edit overwrote'; end if;

  -- durable dispatch: the same operation key cannot be claimed twice
  insert into public.email_dispatch_operations (operation_key, subject, body_sha256, dispatch_mode, requested_count, eligible_count, excluded_count)
  values ('cccccccc-0000-0000-0000-000000000001', 's', 'h', 'test', 1, 1, 0);
  begin
    insert into public.email_dispatch_operations (operation_key, subject, body_sha256, dispatch_mode, requested_count, eligible_count, excluded_count)
    values ('cccccccc-0000-0000-0000-000000000001', 's', 'h', 'test', 1, 1, 0);
    raise exception 'duplicate operation claimed';
  exception when unique_violation then null;
  end;
end $$;
reset role;

-- non-owner cannot save exhibitions or read email tables
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  begin
    perform public.save_exhibition(null, null, '{"title":"Hack"}'::jsonb, '{}'::uuid[]);
    raise exception 'non-owner saved an exhibition';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.email_dispatch_operations) <> 0 then raise exception 'non-owner can read dispatch operations'; end if;
end $$;
reset role;

set role anon;
do $$ begin
  begin
    perform count(*) from public.marketing_unsubscribe_tokens;
    raise exception 'anon can read unsubscribe tokens';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select 'workflow checks passed' as result;
