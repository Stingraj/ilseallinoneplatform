-- Behavioural checks for 20261118000000_studio_quick_wins.sql. Runs after 10_rls_checks.sql (owner/stranger exist).
\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
do $$
declare v_invoice uuid; v_quote uuid;
begin
  -- link-in-bio: only https/mailto links, hidden links never public
  insert into public.website_links (label, url, sort_order) values ('Shop prints', 'https://example.com/prints', 1);
  insert into public.website_links (label, url, sort_order, is_visible) values ('Draft', 'https://example.com/draft', 2, false);
  begin
    insert into public.website_links (label, url) values ('Bad', 'javascript:alert(1)');
    raise exception 'non-https link accepted';
  exception when check_violation then null;
  end;

  -- quotes and invoices keep separate statuses
  insert into public.invoices (invoice_number, amount, issue_date, status) values ('INV-2099-001', 100, current_date, 'unpaid') returning id into v_invoice;
  insert into public.invoices (invoice_number, amount, issue_date, status, kind) values ('Q-2099-001', 100, current_date, 'open', 'quote') returning id into v_quote;
  begin
    insert into public.invoices (invoice_number, amount, issue_date, status, kind) values ('Q-2099-002', 1, current_date, 'paid', 'quote');
    raise exception 'quote accepted an invoice status';
  exception when check_violation then null;
  end;
  begin
    insert into public.invoices (invoice_number, amount, issue_date, status) values ('INV-2099-002', 1, current_date, 'open');
    raise exception 'invoice accepted a quote status';
  exception when check_violation then null;
  end;

  -- automatic reminders: one per stage per invoice; manual reminders (no stage): one per invoice per hour
  insert into public.invoice_reminders (invoice_id, stage) values (v_invoice, 1);
  begin
    insert into public.invoice_reminders (invoice_id, stage) values (v_invoice, 1);
    raise exception 'same reminder stage claimed twice';
  exception when unique_violation then null;
  end;
  insert into public.invoice_reminders (invoice_id, stage) values (v_invoice, null);
  begin
    insert into public.invoice_reminders (invoice_id, stage) values (v_invoice, null);
    raise exception 'two manual reminders in the same hour';
  exception when unique_violation then null;
  end;
  insert into public.invoice_reminders (invoice_id, stage, created_at) values (v_invoice, null, now() - interval '2 hours');

  -- certificates: verify codes must be well formed
  begin
    insert into public.artwork_certificates (certificate_number, verify_code, details) values ('COA-2099-001', 'short', '{}');
    raise exception 'malformed verify code accepted';
  exception when check_violation then null;
  end;
  insert into public.artwork_certificates (certificate_number, verify_code, details) values ('COA-2099-001', 'AbCdEfGhIjKlMnOp', '{"title":"T"}');

  -- file shares: an item is exactly one of an upload under shares/ or an artwork
  insert into public.file_shares (id, title, token_hash) values ('dddddddd-0000-0000-0000-000000000001', 'Press kit', 'hash-1');
  insert into public.file_share_items (share_id, storage_path, file_name) values ('dddddddd-0000-0000-0000-000000000001', 'shares/dddddddd/a.jpg', 'a.jpg');
  begin
    insert into public.file_share_items (share_id, storage_path, file_name) values ('dddddddd-0000-0000-0000-000000000001', 'private/x.pdf', 'x.pdf');
    raise exception 'share item outside shares/ accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.file_share_items (share_id, file_name) values ('dddddddd-0000-0000-0000-000000000001', 'nothing');
    raise exception 'empty share item accepted';
  exception when check_violation then null;
  end;
end $$;
reset role;

-- the public sees visible links only, and nothing else from the new tables
set role anon;
do $$ begin
  if (select count(*) from public.website_links_public) <> 1 then raise exception 'anon sees hidden links'; end if;
  begin
    perform count(*) from public.website_links;
    raise exception 'anon can read the links table';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.artwork_certificates;
    raise exception 'anon can read certificates';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.file_shares;
    raise exception 'anon can read file shares';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.newsletter_confirmations;
    raise exception 'anon can read pending sign-ups';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- a signed-in stranger sees none of it
set role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
do $$ begin
  if (select count(*) from public.website_links) <> 0 then raise exception 'stranger can read links'; end if;
  if (select count(*) from public.artwork_certificates) <> 0 then raise exception 'stranger can read certificates'; end if;
  if (select count(*) from public.file_shares) <> 0 then raise exception 'stranger can read shares'; end if;
  if (select count(*) from public.invoice_reminders) <> 0 then raise exception 'stranger can read reminders'; end if;
end $$;
reset role;

-- clean up so the rollback/re-apply cycle starts from the same state
delete from public.file_shares;
delete from public.artwork_certificates;
delete from public.invoice_reminders;
delete from public.invoices where invoice_number like '%-2099-%';
delete from public.website_links;
select 'quick-win checks passed' as result;
