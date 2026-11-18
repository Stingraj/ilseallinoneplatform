-- Artist Studio · quick wins: link-in-bio, double opt-in sign-ups, certificates of authenticity, quotes and payment
-- reminders, secure file sharing. Additive only; depends on 20261025000000, 20261025000100 and 20261030000000.
-- Apply to a Supabase branch/staging copy first. Reverse with ../rollback/20261118000000_studio_quick_wins.down.sql.

begin;

-- 1. Link-in-bio (/links) ------------------------------------------------------------------------------------------
create table if not exists public.website_links (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  url text not null check (url ~ '^(https://|mailto:)' and char_length(url) <= 500),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists website_links_order_idx on public.website_links (sort_order, created_at);

-- Public projection: visible links only, no IDs or timestamps.
create or replace view public.website_links_public as
select label, url, sort_order
from public.website_links
where is_visible = true;
grant select on public.website_links_public to anon, authenticated;

-- 2. Newsletter double opt-in --------------------------------------------------------------------------------------
-- A sign-up creates a pending confirmation only. The contact gets marketing consent when the link is confirmed.
create table if not exists public.newsletter_confirmations (
  token_hash text primary key,
  email_normalized text not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  confirmed_at timestamptz
);
create index if not exists newsletter_confirmations_email_idx on public.newsletter_confirmations (email_normalized, created_at desc);
create index if not exists newsletter_confirmations_ip_idx on public.newsletter_confirmations (ip_hash, created_at desc);

-- 3. Certificates of authenticity ----------------------------------------------------------------------------------
-- verify_code is printed on the certificate (QR code). It is not a secret credential: the verify page shows only
-- what the certificate itself shows. It is random so certificates cannot be enumerated.
create table if not exists public.artwork_certificates (
  id uuid primary key default gen_random_uuid(),
  artwork_id uuid references public.artworks (id) on delete set null,
  certificate_number text not null unique,
  verify_code text not null unique check (verify_code ~ '^[A-Za-z0-9_-]{16}$'),
  details jsonb not null,
  contact_id uuid references public.contacts (id) on delete set null,
  issued_to text,
  issued_on date not null default current_date,
  revoked_at timestamptz,
  revoke_reason text,
  created_at timestamptz not null default now()
);
create index if not exists artwork_certificates_artwork_idx on public.artwork_certificates (artwork_id, created_at desc);

-- 4. Quotes, payment dates and reminders ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists kind text not null default 'invoice',
  add column if not exists valid_until date,
  add column if not exists paid_at timestamptz,
  add column if not exists converted_invoice_id uuid references public.invoices (id) on delete set null;

alter table public.invoices drop constraint if exists invoices_kind_check;
alter table public.invoices add constraint invoices_kind_check check (kind in ('invoice', 'quote'));

-- Quotes have their own statuses; invoices keep exactly the original four.
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (
  (kind = 'invoice' and status in ('unpaid', 'paid', 'overdue', 'cancelled'))
  or (kind = 'quote' and status in ('open', 'accepted', 'declined', 'expired'))
);

-- One row per reminder. stage is set for automatic reminders and unique per invoice, so the daily job can never send
-- the same reminder twice; manual reminders have no stage.
create table if not exists public.invoice_reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  stage integer check (stage between 1 and 10),
  state text not null default 'dispatching' check (state in ('dispatching', 'accepted_by_workflow', 'failed', 'not_sent')),
  error text,
  created_at timestamptz not null default now()
);
create unique index if not exists invoice_reminders_stage_key on public.invoice_reminders (invoice_id, stage) where stage is not null;
create index if not exists invoice_reminders_invoice_idx on public.invoice_reminders (invoice_id, created_at desc);

-- Automatic reminders are off until the owner turns them on in Settings.
alter table public.studio_settings
  add column if not exists payment_reminders_enabled boolean not null default false,
  add column if not exists payment_reminder_days integer[] not null default '{3,10,21}';

-- 5. Secure file sharing -------------------------------------------------------------------------------------------
create table if not exists public.file_shares (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  message text,
  token_hash text not null unique,
  passcode text,
  contact_id uuid references public.contacts (id) on delete set null,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- An item is either a file uploaded to the private documents bucket or an existing artwork image.
create table if not exists public.file_share_items (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.file_shares (id) on delete cascade,
  storage_path text,
  artwork_id uuid references public.artworks (id) on delete cascade,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check ((storage_path is not null) <> (artwork_id is not null)),
  check (storage_path is null or storage_path like 'shares/%')
);
create index if not exists file_share_items_share_idx on public.file_share_items (share_id, sort_order);

create table if not exists public.file_share_downloads (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.file_shares (id) on delete cascade,
  item_id uuid references public.file_share_items (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists file_share_downloads_share_idx on public.file_share_downloads (share_id, created_at desc);

-- 6. RLS: owner-only; anon has no access (public pages go through validated server code) -------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'website_links', 'newsletter_confirmations', 'artwork_certificates', 'invoice_reminders',
    'file_shares', 'file_share_items', 'file_share_downloads'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_studio_owner()) with check (public.is_studio_owner())',
      t || '_owner_all', t
    );
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

commit;
