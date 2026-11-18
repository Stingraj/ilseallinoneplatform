-- Reverses 20261118000000_studio_quick_wins.sql. WARNING: deletes links, pending sign-ups, certificates, quotes,
-- reminder history and file shares (files already uploaded under documents/shares/ stay in storage; remove them in
-- the Supabase dashboard if wanted). Invoices themselves are kept.
begin;
drop table if exists public.file_share_downloads;
drop table if exists public.file_share_items;
drop table if exists public.file_shares;
drop table if exists public.invoice_reminders;
alter table public.studio_settings
  drop column if exists payment_reminder_days,
  drop column if exists payment_reminders_enabled;

-- Quotes cannot exist without the kind column; the original status check is restored.
update public.invoices set converted_invoice_id = null where converted_invoice_id is not null;
delete from public.invoices where kind = 'quote';
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices drop constraint if exists invoices_kind_check;
alter table public.invoices
  drop column if exists converted_invoice_id,
  drop column if exists paid_at,
  drop column if exists valid_until,
  drop column if exists kind;
alter table public.invoices add constraint invoices_status_check check (status in ('unpaid', 'paid', 'overdue', 'cancelled'));

drop table if exists public.artwork_certificates;
drop table if exists public.newsletter_confirmations;
drop view if exists public.website_links_public;
drop table if exists public.website_links;
commit;
