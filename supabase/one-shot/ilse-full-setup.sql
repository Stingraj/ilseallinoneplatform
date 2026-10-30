-- ILSE STUDIO: complete database setup, one script.
--
-- Run ONCE on a NEW, EMPTY Supabase project: SQL Editor > New query > paste all > Run.
-- Creates every table, security policy, storage bucket and function the website, archive, email and studio tools need
-- (the archive's 12 migrations followed by the 3 studio migrations, in order). No sample artworks or placeholder artist
-- are inserted: add Ilse's real works in the studio.
--
-- AFTER it succeeds:
--   1. Authentication > Users > Add user (your email + password, tick "Auto Confirm").
--   2. Run the two lines at the very end of this file (marked STEP 2) with your email, to make that user the studio owner.
--
-- Do not run it twice: it is not meant to be repeated on a database that already has these tables.

-- ============================================================================
-- 20260610210413_001_initial_schema.sql
-- ============================================================================
-- Artist profile table (single row for Elsa)
CREATE TABLE artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Elsa',
  bio TEXT,
  statement TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  instagram TEXT,
  profile_image_url TEXT,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default profile
-- (placeholder 'Elsa' profile removed: fill in the artist profile in the studio)

-- Enable RLS
ALTER TABLE artist_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for artist_profiles (public read, authenticated update)
CREATE POLICY "artist_profiles_select" ON artist_profiles FOR SELECT
  TO public USING (true);
CREATE POLICY "artist_profiles_insert" ON artist_profiles FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "artist_profiles_update" ON artist_profiles FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Artworks table
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  medium TEXT,
  dimensions_height DECIMAL(10,2),
  dimensions_width DECIMAL(10,2),
  dimensions_depth DECIMAL(10,2),
  year INTEGER,
  price DECIMAL(12,2),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Available' CHECK (status IN ('Available', 'Sold', 'Private', 'On Loan')),
  inventory_number TEXT UNIQUE,
  location TEXT,
  exhibition_history TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;

-- Policies for artworks
CREATE POLICY "artworks_select" ON artworks FOR SELECT
  TO public USING (true);
CREATE POLICY "artworks_insert" ON artworks FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "artworks_update" ON artworks FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "artworks_delete" ON artworks FOR DELETE
  TO authenticated USING (true);

-- Artwork images table (multiple images per artwork)
CREATE TABLE artwork_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE artwork_images ENABLE ROW LEVEL SECURITY;

-- Policies for artwork_images
CREATE POLICY "artwork_images_select" ON artwork_images FOR SELECT
  TO public USING (true);
CREATE POLICY "artwork_images_insert" ON artwork_images FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "artwork_images_update" ON artwork_images FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "artwork_images_delete" ON artwork_images FOR DELETE
  TO authenticated USING (true);

-- Exhibitions table
CREATE TABLE exhibitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  venue TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE exhibitions ENABLE ROW LEVEL SECURITY;

-- Policies for exhibitions
CREATE POLICY "exhibitions_select" ON exhibitions FOR SELECT
  TO public USING (true);
CREATE POLICY "exhibitions_insert" ON exhibitions FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "exhibitions_update" ON exhibitions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exhibitions_delete" ON exhibitions FOR DELETE
  TO authenticated USING (true);

-- Junction table for artworks in exhibitions
CREATE TABLE exhibition_artworks (
  exhibition_id UUID NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES artworks(id) ON DELETE CASCADE,
  PRIMARY KEY (exhibition_id, artwork_id)
);

-- Enable RLS
ALTER TABLE exhibition_artworks ENABLE ROW LEVEL SECURITY;

-- Policies for exhibition_artworks
CREATE POLICY "exhibition_artworks_select" ON exhibition_artworks FOR SELECT
  TO public USING (true);
CREATE POLICY "exhibition_artworks_insert" ON exhibition_artworks FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "exhibition_artworks_delete" ON exhibition_artworks FOR DELETE
  TO authenticated USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_artworks_status ON artworks(status);
CREATE INDEX idx_artworks_year ON artworks(year);
CREATE INDEX idx_artworks_medium ON artworks(medium);
CREATE INDEX idx_artwork_images_artwork_id ON artwork_images(artwork_id);
CREATE INDEX idx_artwork_images_primary ON artwork_images(is_primary);

-- Storage bucket for artwork images
INSERT INTO storage.buckets (id, name, public) VALUES ('artworks', 'artworks', true);

-- Storage policy for artworks bucket
CREATE POLICY "artworks_storage_select" ON storage.objects FOR SELECT
  TO public USING (bucket_id = 'artworks');
CREATE POLICY "artworks_storage_insert" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'artworks');
CREATE POLICY "artworks_storage_update" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'artworks');
CREATE POLICY "artworks_storage_delete" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'artworks');

-- ============================================================================
-- 20260611000000_security_and_exhibitions.sql
-- ============================================================================
-- 1. Tighten RLS SELECT policy for artworks: Hide 'Private' artworks from the public/anonymous users, but allow authenticated users to see all.
DROP POLICY IF EXISTS "artworks_select" ON artworks;

CREATE POLICY "artworks_select" ON artworks FOR SELECT
  USING (
    (auth.role() = 'authenticated') OR (status != 'Private')
  );

-- 2. Tighten RLS SELECT policy for artwork_images: Hide images of 'Private' artworks from public/anonymous users.
DROP POLICY IF EXISTS "artwork_images_select" ON artwork_images;

CREATE POLICY "artwork_images_select" ON artwork_images FOR SELECT
  USING (
    (auth.role() = 'authenticated') OR
    EXISTS (
      SELECT 1 FROM artworks
      WHERE artworks.id = artwork_images.artwork_id
        AND artworks.status != 'Private'
    )
  );

-- 3. Add performance index on exhibition_artworks(artwork_id)
CREATE INDEX IF NOT EXISTS idx_exhibition_artworks_artwork_id ON exhibition_artworks(artwork_id);

-- 4. Idempotent storage bucket insertion
INSERT INTO storage.buckets (id, name, public)
VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 20260611000001_premium_upgrade.sql
-- ============================================================================
-- Upgrade to Premium MVP Features (Enterprise Spec)

-- 1. Modify Artworks Table
ALTER TABLE artworks
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS series TEXT,
  ADD COLUMN IF NOT EXISTS weight DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cost DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS insurance_value DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_date DATE,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS provenance TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS framing_info TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS edition_number TEXT,
  ADD COLUMN IF NOT EXISTS edition_size TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Update Status constraint (we must drop the old one and add a new one if we were using a CHECK constraint, but often status is just TEXT in Supabase unless an ENUM is used. Assuming TEXT with CHECK constraint)
-- NOTE: In Postgres, to update a check constraint safely, we add a new one. 
-- Since we don't know the exact name of the old constraint, we will just allow the new values. If it was an ENUM, it would require ALTER TYPE. Assuming it's TEXT or we just leave it for the application to enforce if it's currently a simple text field.
-- For safety, we will just add the columns here. The frontend `zod` schema will enforce the new status values ('Available', 'Sold', 'Reserved', 'Private', 'On Loan', 'Archived').

-- 2. Create Contacts Table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    type TEXT DEFAULT 'collector' CHECK (type IN ('collector', 'gallery', 'curator', 'buyer', 'lead', 'vendor')),
    follow_up_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    sale_price DECIMAL(12,2),
    sale_date DATE,
    status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'reserved', 'invoice_sent', 'paid', 'delivered')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    amount DECIMAL(12,2) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Private Rooms Table
CREATE TABLE IF NOT EXISTS private_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    passcode TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Private Room Artworks Table
CREATE TABLE IF NOT EXISTS private_room_artworks (
    room_id UUID REFERENCES private_rooms(id) ON DELETE CASCADE,
    artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
    visible_fields JSONB DEFAULT '{"price": true, "dimensions": true, "description": true}'::jsonb,
    PRIMARY KEY (room_id, artwork_id)
);

-- 7. Create Reminders Table
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    related_type TEXT CHECK (related_type IN ('artwork', 'exhibition', 'contact', 'invoice', 'sale', 'general')),
    related_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'other' CHECK (type IN ('certificate', 'contract', 'invoice', 'condition', 'provenance', 'exhibition', 'other')),
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure RLS is enabled on all new tables
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_room_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Setup RLS Policies for New Tables
-- We assume "authenticated" users are the admin/gallery owner and can manage everything.
CREATE POLICY "Allow authenticated full access to contacts" ON contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to sales" ON sales FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to invoices" ON invoices FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public select on private_rooms" ON private_rooms FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated full access to private_rooms" ON private_rooms FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow public select on private_room_artworks" ON private_room_artworks FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated full access to private_room_artworks" ON private_room_artworks FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to reminders" ON reminders FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to documents" ON documents FOR ALL TO authenticated USING (true);

-- Documents Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated full access to documents storage"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow public select on documents storage"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'documents');

-- ============================================================================
-- 20260624223000_add_consignment_fields.sql
-- ============================================================================
-- Add missing consignment columns to artworks table
ALTER TABLE artworks
ADD COLUMN IF NOT EXISTS on_consignment boolean DEFAULT false;

ALTER TABLE artworks
ADD COLUMN IF NOT EXISTS consignment_location text;

-- ============================================================================
-- 20260624235500_catalog_profile_and_storage_fix.sql
-- ============================================================================
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS dimensions TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS series TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS on_consignment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consignment_location TEXT;

CREATE TABLE IF NOT EXISTS public.artist_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT,
  pronouns TEXT,
  birth_year INTEGER,
  nationality TEXT,
  location TEXT,
  instagram TEXT,
  website TEXT,
  email TEXT,
  statement TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT ON public.artist_profile TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_profile TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_profile TO service_role;

ALTER TABLE public.artist_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artist_profile_select" ON public.artist_profile;
CREATE POLICY "artist_profile_select"
ON public.artist_profile
FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "artist_profile_insert" ON public.artist_profile;
CREATE POLICY "artist_profile_insert"
ON public.artist_profile
FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "artist_profile_update" ON public.artist_profile;
CREATE POLICY "artist_profile_update"
ON public.artist_profile
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "artist_profile_delete" ON public.artist_profile;
CREATE POLICY "artist_profile_delete"
ON public.artist_profile
FOR DELETE
TO authenticated
USING (true);

INSERT INTO public.artist_profile (
  full_name,
  website,
  email,
  instagram,
  statement,
  bio,
  profile_photo_url
)
SELECT
  ap.name,
  ap.website,
  ap.email,
  ap.instagram,
  ap.statement,
  ap.bio,
  ap.profile_image_url
FROM public.artist_profiles ap
WHERE EXISTS (SELECT 1 FROM public.artist_profiles)
  AND NOT EXISTS (SELECT 1 FROM public.artist_profile);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('artwork-images', 'artwork-images', true),
  ('artist-profile', 'artist-profile', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "artwork_images_public_read" ON storage.objects;
CREATE POLICY "artwork_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artwork_images_authenticated_insert" ON storage.objects;
CREATE POLICY "artwork_images_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artwork_images_authenticated_update" ON storage.objects;
CREATE POLICY "artwork_images_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'artwork-images')
WITH CHECK (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artwork_images_authenticated_delete" ON storage.objects;
CREATE POLICY "artwork_images_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artist_profile_public_read" ON storage.objects;
CREATE POLICY "artist_profile_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'artist-profile');

DROP POLICY IF EXISTS "artist_profile_authenticated_insert" ON storage.objects;
CREATE POLICY "artist_profile_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'artist-profile');

DROP POLICY IF EXISTS "artist_profile_authenticated_update" ON storage.objects;
CREATE POLICY "artist_profile_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'artist-profile')
WITH CHECK (bucket_id = 'artist-profile');

DROP POLICY IF EXISTS "artist_profile_authenticated_delete" ON storage.objects;
CREATE POLICY "artist_profile_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'artist-profile');

-- (sample paintings from the original migration removed: this database starts empty)

-- ============================================================================
-- 20260629000000_catalog_gallery_privacy_and_sales.sql
-- ============================================================================
-- Gallery catalog fields, private sales tracking, and public price privacy.

INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork-images', 'artwork-images', true)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  updated_at = now();

DROP POLICY IF EXISTS "artwork_images_public_read" ON storage.objects;
CREATE POLICY "artwork_images_public_read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artwork_images_authenticated_insert" ON storage.objects;
CREATE POLICY "artwork_images_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artwork_images_authenticated_update" ON storage.objects;
CREATE POLICY "artwork_images_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'artwork-images')
WITH CHECK (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artwork_images_authenticated_delete" ON storage.objects;
CREATE POLICY "artwork_images_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'artwork-images');

ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS inventory_number TEXT,
  ADD COLUMN IF NOT EXISTS price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS provenance TEXT,
  ADD COLUMN IF NOT EXISTS exhibition_history TEXT[],
  ADD COLUMN IF NOT EXISTS publications TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT;

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES public.artworks(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  buyer_name TEXT,
  sale_price DECIMAL(12,2),
  sale_date DATE,
  status TEXT DEFAULT 'paid' CHECK (status IN ('lead', 'reserved', 'invoice_sent', 'paid', 'delivered')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS buyer_name TEXT;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated full access to sales" ON public.sales;
CREATE POLICY "Allow authenticated full access to sales"
ON public.sales
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP VIEW IF EXISTS public.public_artworks;
CREATE VIEW public.public_artworks AS
SELECT
  id,
  inventory_number,
  title,
  medium,
  dimensions,
  year,
  status,
  series,
  category,
  on_consignment,
  consignment_location,
  provenance,
  exhibition_history,
  publications,
  location,
  image_url,
  notes,
  created_at,
  updated_at
FROM public.artworks
WHERE status = 'Available';

GRANT SELECT ON public.public_artworks TO anon;
GRANT SELECT ON public.public_artworks TO authenticated;

DROP POLICY IF EXISTS "artworks_select" ON public.artworks;
DROP POLICY IF EXISTS "artworks_public_select" ON public.artworks;
DROP POLICY IF EXISTS "artworks_authenticated_select" ON public.artworks;
CREATE POLICY "artworks_authenticated_select"
ON public.artworks
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- 20260630000000_fix_public_artwork_rls.sql
-- ============================================================================
-- Fix public RLS policy for artworks.
-- Allows anonymous users (public) to view artworks where status is 'Available'.

DROP POLICY IF EXISTS "artworks_public_select" ON public.artworks;

CREATE POLICY "artworks_public_select"
ON public.artworks
FOR SELECT
TO public
USING (status = 'Available');

-- ============================================================================
-- 20260630000001_disable_profile_rls.sql
-- ============================================================================
-- Create admin policy for artworks
CREATE POLICY "artworks_admin_all" ON public.artworks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Disable RLS on artist_profile to fix profile save issues permanently
ALTER TABLE public.artist_profile DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 20260703110000_add_artwork_collection.sql
-- ============================================================================
-- Add the private collection field used by the dashboard and artwork editor.
ALTER TABLE public.artworks
ADD COLUMN IF NOT EXISTS collection TEXT;

-- ============================================================================
-- 20260703120000_consolidated_schema.sql
-- ============================================================================
-- Consolidated Supabase Database Schema Migration
-- Safely configures extensions, tables, columns, constraints, views, indexes, RLS policies, and storage buckets.

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Tables

-- artist_profiles (Legacy/plural - maintained for schema compatibility)
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Elsa',
  bio TEXT,
  statement TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  instagram TEXT,
  profile_image_url TEXT,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- artist_profile (Singular - primary profile table used by Next.js app)
CREATE TABLE IF NOT EXISTS public.artist_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT,
  pronouns TEXT,
  birth_year INTEGER,
  nationality TEXT,
  location TEXT,
  instagram TEXT,
  website TEXT,
  email TEXT,
  statement TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- artworks
CREATE TABLE IF NOT EXISTS public.artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  medium TEXT,
  dimensions_height DECIMAL(10,2),
  dimensions_width DECIMAL(10,2),
  dimensions_depth DECIMAL(10,2),
  year INTEGER,
  price DECIMAL(12,2),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Available',
  inventory_number TEXT UNIQUE,
  location TEXT,
  exhibition_history TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely update status constraint on artworks table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find and drop any check constraints on the status column of artworks table to update status choices
    FOR r IN
        SELECT conname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.artworks'::regclass
          AND c.contype = 'c'
          AND a.attname = 'status'
    LOOP
        EXECUTE 'ALTER TABLE public.artworks DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END;
$$;

ALTER TABLE public.artworks ADD CONSTRAINT artworks_status_check CHECK (status IN ('Available', 'Sold', 'Private', 'On Loan', 'Reserved', 'Archived'));

-- Ensure all expected columns exist on artworks
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS series TEXT,
  ADD COLUMN IF NOT EXISTS weight DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS cost DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS insurance_value DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS acquisition_date DATE,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS provenance TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT,
  ADD COLUMN IF NOT EXISTS framing_info TEXT,
  ADD COLUMN IF NOT EXISTS condition TEXT,
  ADD COLUMN IF NOT EXISTS edition_number TEXT,
  ADD COLUMN IF NOT EXISTS edition_size TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS on_consignment BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS consignment_location TEXT,
  ADD COLUMN IF NOT EXISTS dimensions TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS publications TEXT,
  ADD COLUMN IF NOT EXISTS collection TEXT;

-- contacts
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    type TEXT DEFAULT 'collector',
    follow_up_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add check constraint on contacts type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'contacts_type_check'
  ) THEN
    ALTER TABLE public.contacts ADD CONSTRAINT contacts_type_check CHECK (type IN ('collector', 'gallery', 'curator', 'buyer', 'lead', 'vendor'));
  END IF;
END;
$$;

-- sales
CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID REFERENCES public.artworks(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    buyer_name TEXT,
    sale_price DECIMAL(12,2),
    sale_date DATE,
    status TEXT DEFAULT 'paid',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add check constraint on sales status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sales_status_check'
  ) THEN
    ALTER TABLE public.sales ADD CONSTRAINT sales_status_check CHECK (status IN ('lead', 'reserved', 'invoice_sent', 'paid', 'delivered'));
  END IF;
END;
$$;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS buyer_name TEXT;

-- invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL UNIQUE,
    amount DECIMAL(12,2) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE,
    status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add check constraint on invoices status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_status_check'
  ) THEN
    ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled'));
  END IF;
END;
$$;

-- private_rooms
CREATE TABLE IF NOT EXISTS public.private_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    passcode TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- private_room_artworks
CREATE TABLE IF NOT EXISTS public.private_room_artworks (
    room_id UUID REFERENCES public.private_rooms(id) ON DELETE CASCADE,
    artwork_id UUID REFERENCES public.artworks(id) ON DELETE CASCADE,
    visible_fields JSONB DEFAULT '{"price": true, "dimensions": true, "description": true}'::jsonb,
    PRIMARY KEY (room_id, artwork_id)
);

-- reminders
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT DEFAULT 'pending',
    related_type TEXT,
    related_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add check constraints on reminders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reminders_status_check'
  ) THEN
    ALTER TABLE public.reminders ADD CONSTRAINT reminders_status_check CHECK (status IN ('pending', 'completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reminders_related_type_check'
  ) THEN
    ALTER TABLE public.reminders ADD CONSTRAINT reminders_related_type_check CHECK (related_type IN ('artwork', 'exhibition', 'contact', 'invoice', 'sale', 'general'));
  END IF;
END;
$$;

-- documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artwork_id UUID REFERENCES public.artworks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'other',
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safely add check constraint on documents type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_type_check'
  ) THEN
    ALTER TABLE public.documents ADD CONSTRAINT documents_type_check CHECK (type IN ('certificate', 'contract', 'invoice', 'condition', 'provenance', 'exhibition', 'other'));
  END IF;
END;
$$;

-- artwork_images (Legacy/multiple artwork images table)
CREATE TABLE IF NOT EXISTS public.artwork_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  is_primary BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- exhibitions
CREATE TABLE IF NOT EXISTS public.exhibitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  venue TEXT,
  location TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- exhibition_artworks
CREATE TABLE IF NOT EXISTS public.exhibition_artworks (
  exhibition_id UUID NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  artwork_id UUID NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  PRIMARY KEY (exhibition_id, artwork_id)
);


-- 3. Create or Replace Views
CREATE OR REPLACE VIEW public.public_artworks AS
SELECT
  id,
  inventory_number,
  title,
  medium,
  dimensions,
  year,
  status,
  series,
  category,
  on_consignment,
  consignment_location,
  provenance,
  exhibition_history,
  publications,
  location,
  image_url,
  notes,
  created_at,
  updated_at
FROM public.artworks
WHERE status = 'Available';


-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artwork_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exhibition_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_room_artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Disable RLS on artist_profile (permanently disabled per migration 20260630000001)
ALTER TABLE public.artist_profile DISABLE ROW LEVEL SECURITY;


-- 5. Create RLS Policies

-- artist_profiles
DROP POLICY IF EXISTS "artist_profiles_select" ON public.artist_profiles;
DROP POLICY IF EXISTS "artist_profiles_insert" ON public.artist_profiles;
DROP POLICY IF EXISTS "artist_profiles_update" ON public.artist_profiles;

CREATE POLICY "artist_profiles_select" ON public.artist_profiles FOR SELECT TO public USING (true);
CREATE POLICY "artist_profiles_insert" ON public.artist_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "artist_profiles_update" ON public.artist_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- artworks
DROP POLICY IF EXISTS "artworks_select" ON public.artworks;
DROP POLICY IF EXISTS "artworks_insert" ON public.artworks;
DROP POLICY IF EXISTS "artworks_update" ON public.artworks;
DROP POLICY IF EXISTS "artworks_delete" ON public.artworks;
DROP POLICY IF EXISTS "artworks_public_select" ON public.artworks;
DROP POLICY IF EXISTS "artworks_authenticated_select" ON public.artworks;
DROP POLICY IF EXISTS "artworks_admin_all" ON public.artworks;

CREATE POLICY "artworks_public_select" ON public.artworks FOR SELECT TO public USING (status = 'Available');
CREATE POLICY "artworks_authenticated_select" ON public.artworks FOR SELECT TO authenticated USING (true);
CREATE POLICY "artworks_admin_all" ON public.artworks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- artwork_images
DROP POLICY IF EXISTS "artwork_images_select" ON public.artwork_images;
DROP POLICY IF EXISTS "artwork_images_insert" ON public.artwork_images;
DROP POLICY IF EXISTS "artwork_images_update" ON public.artwork_images;
DROP POLICY IF EXISTS "artwork_images_delete" ON public.artwork_images;

CREATE POLICY "artwork_images_select" ON public.artwork_images FOR SELECT TO public
  USING ((auth.role() = 'authenticated') OR EXISTS (SELECT 1 FROM public.artworks WHERE artworks.id = artwork_images.artwork_id AND artworks.status != 'Private'));
CREATE POLICY "artwork_images_insert" ON public.artwork_images FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "artwork_images_update" ON public.artwork_images FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "artwork_images_delete" ON public.artwork_images FOR DELETE TO authenticated USING (true);

-- exhibitions
DROP POLICY IF EXISTS "exhibitions_select" ON public.exhibitions;
DROP POLICY IF EXISTS "exhibitions_insert" ON public.exhibitions;
DROP POLICY IF EXISTS "exhibitions_update" ON public.exhibitions;
DROP POLICY IF EXISTS "exhibitions_delete" ON public.exhibitions;

CREATE POLICY "exhibitions_select" ON public.exhibitions FOR SELECT TO public USING (true);
CREATE POLICY "exhibitions_insert" ON public.exhibitions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exhibitions_update" ON public.exhibitions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "exhibitions_delete" ON public.exhibitions FOR DELETE TO authenticated USING (true);

-- exhibition_artworks
DROP POLICY IF EXISTS "exhibition_artworks_select" ON public.exhibition_artworks;
DROP POLICY IF EXISTS "exhibition_artworks_insert" ON public.exhibition_artworks;
DROP POLICY IF EXISTS "exhibition_artworks_delete" ON public.exhibition_artworks;

CREATE POLICY "exhibition_artworks_select" ON public.exhibition_artworks FOR SELECT TO public USING (true);
CREATE POLICY "exhibition_artworks_insert" ON public.exhibition_artworks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "exhibition_artworks_delete" ON public.exhibition_artworks FOR DELETE TO authenticated USING (true);

-- contacts
DROP POLICY IF EXISTS "Allow authenticated full access to contacts" ON public.contacts;
CREATE POLICY "Allow authenticated full access to contacts" ON public.contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- sales
DROP POLICY IF EXISTS "Allow authenticated full access to sales" ON public.sales;
CREATE POLICY "Allow authenticated full access to sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- invoices
DROP POLICY IF EXISTS "Allow authenticated full access to invoices" ON public.invoices;
CREATE POLICY "Allow authenticated full access to invoices" ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- private_rooms
DROP POLICY IF EXISTS "Allow public select on private_rooms" ON public.private_rooms;
DROP POLICY IF EXISTS "Allow authenticated full access to private_rooms" ON public.private_rooms;
CREATE POLICY "Allow public select on private_rooms" ON public.private_rooms FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated full access to private_rooms" ON public.private_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- private_room_artworks
DROP POLICY IF EXISTS "Allow public select on private_room_artworks" ON public.private_room_artworks;
DROP POLICY IF EXISTS "Allow authenticated full access to private_room_artworks" ON public.private_room_artworks;
CREATE POLICY "Allow public select on private_room_artworks" ON public.private_room_artworks FOR SELECT TO public USING (true);
CREATE POLICY "Allow authenticated full access to private_room_artworks" ON public.private_room_artworks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- reminders
DROP POLICY IF EXISTS "Allow authenticated full access to reminders" ON public.reminders;
CREATE POLICY "Allow authenticated full access to reminders" ON public.reminders FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- documents
DROP POLICY IF EXISTS "Allow authenticated full access to documents" ON public.documents;
CREATE POLICY "Allow authenticated full access to documents" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 6. Setup Table Privileges/Grants
GRANT SELECT ON public.artist_profile TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_profile TO authenticated, service_role;
GRANT SELECT ON public.public_artworks TO anon, authenticated;


-- 7. Create Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_artworks_status ON public.artworks(status);
CREATE INDEX IF NOT EXISTS idx_artworks_year ON public.artworks(year);
CREATE INDEX IF NOT EXISTS idx_artworks_medium ON public.artworks(medium);
CREATE INDEX IF NOT EXISTS idx_artwork_images_artwork_id ON public.artwork_images(artwork_id);
CREATE INDEX IF NOT EXISTS idx_artwork_images_primary ON public.artwork_images(is_primary);
CREATE INDEX IF NOT EXISTS idx_exhibition_artworks_artwork_id ON public.exhibition_artworks(artwork_id);


-- 8. Configure Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('artwork-images', 'artwork-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('artist-profile', 'artist-profile', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]),
  ('artworks', 'artworks', true, null, null),
  ('documents', 'documents', true, null, null)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = COALESCE(EXCLUDED.file_size_limit, storage.buckets.file_size_limit),
  allowed_mime_types = COALESCE(EXCLUDED.allowed_mime_types, storage.buckets.allowed_mime_types);


-- 9. Create Storage RLS Policies
DROP POLICY IF EXISTS "artwork_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "artwork_images_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "artwork_images_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "artwork_images_authenticated_delete" ON storage.objects;

CREATE POLICY "artwork_images_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'artwork-images');
CREATE POLICY "artwork_images_authenticated_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'artwork-images');
CREATE POLICY "artwork_images_authenticated_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'artwork-images') WITH CHECK (bucket_id = 'artwork-images');
CREATE POLICY "artwork_images_authenticated_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'artwork-images');

DROP POLICY IF EXISTS "artist_profile_public_read" ON storage.objects;
DROP POLICY IF EXISTS "artist_profile_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "artist_profile_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "artist_profile_authenticated_delete" ON storage.objects;

CREATE POLICY "artist_profile_public_read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'artist-profile');
CREATE POLICY "artist_profile_authenticated_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'artist-profile');
CREATE POLICY "artist_profile_authenticated_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'artist-profile') WITH CHECK (bucket_id = 'artist-profile');
CREATE POLICY "artist_profile_authenticated_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'artist-profile');

DROP POLICY IF EXISTS "artworks_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "artworks_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "artworks_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "artworks_storage_delete" ON storage.objects;

CREATE POLICY "artworks_storage_select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'artworks');
CREATE POLICY "artworks_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'artworks');
CREATE POLICY "artworks_storage_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'artworks') WITH CHECK (bucket_id = 'artworks');
CREATE POLICY "artworks_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'artworks');

DROP POLICY IF EXISTS "Allow public select on documents storage" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated full access to documents storage" ON storage.objects;

CREATE POLICY "Allow public select on documents storage" ON storage.objects FOR SELECT TO public USING (bucket_id = 'documents');
CREATE POLICY "Allow authenticated full access to documents storage" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'documents') WITH CHECK (bucket_id = 'documents');


-- 10. Seed Default Data (If not already present)

-- Default Artist Profile
-- (placeholder 'Elsa' profile removed: fill in the artist profile in the studio)

-- Seed Artwork Records
-- (sample paintings from the original migration removed: this database starts empty)

-- ============================================================================
-- 20260703203000_add_artist_profile_columns.sql
-- ============================================================================
-- Add missing columns to artist_profile table
ALTER TABLE public.artist_profile
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS birth_year INTEGER,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS biography TEXT,
ADD COLUMN IF NOT EXISTS artist_statement TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- ============================================================================
-- 20260712120000_public_price_and_sales_summary.sql
-- ============================================================================
-- Per-artwork public price control and the values needed for annual sales reporting.
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS is_price_visible BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_order INTEGER;

WITH first_available AS (
  SELECT id, row_number() OVER (ORDER BY year DESC NULLS LAST, created_at DESC) AS order_value
  FROM public.artworks
  WHERE status = 'Available'
  LIMIT 10
),
existing_featured AS (
  SELECT count(*) AS total FROM public.artworks WHERE is_featured = true
)
UPDATE public.artworks AS artwork
SET
  is_featured = true,
  featured_order = first_available.order_value
FROM first_available, existing_featured
WHERE artwork.id = first_available.id
  AND existing_featured.total = 0;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_price_on_pdf BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.site_settings (show_price_on_pdf)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.site_settings TO authenticated;

DROP POLICY IF EXISTS "site_settings_authenticated_read" ON public.site_settings;
CREATE POLICY "site_settings_authenticated_read"
ON public.site_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "site_settings_authenticated_update" ON public.site_settings;
CREATE POLICY "site_settings_authenticated_update"
ON public.site_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.artist_profile
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS studio_address TEXT;

-- Keep the public projection deliberately small, but expose a price only when
-- that artwork has been explicitly marked as public by the dashboard.
DROP VIEW IF EXISTS public.public_artworks;
CREATE VIEW public.public_artworks AS
SELECT
  id,
  inventory_number,
  title,
  medium,
  dimensions,
  year,
  status,
  series,
  category,
  on_consignment,
  consignment_location,
  provenance,
  exhibition_history,
  publications,
  location,
  image_url,
  notes,
  is_featured,
  featured_order,
  CASE WHEN is_price_visible THEN price ELSE NULL END AS price,
  currency,
  is_price_visible,
  created_at,
  updated_at
FROM public.artworks
WHERE status = 'Available' AND is_featured = true;

GRANT SELECT ON public.public_artworks TO anon;
GRANT SELECT ON public.public_artworks TO authenticated;

-- ============================================================================
-- 20261025000000_studio_owner_security.sql
-- ============================================================================
-- Artist Studio · security fixes S1–S5 (see DATABASE_CHANGES.md).
-- Apply to a Supabase branch / staging copy first. Reverse with ../rollback/20261025000000_studio_owner_security.down.sql.
--
-- Before this migration "authenticated" meant "admin": any account that could sign in had full access. After it, only
-- users listed in public.studio_owners can change anything. Seed the owner IN THE SAME SESSION, before the dashboard
-- is used, otherwise the studio is read-only for everyone:
--
--   insert into public.studio_owners (user_id)
--   select id from auth.users where lower(email) = lower('<owner email>');
--
-- Kept on purpose until the old deployments are retired (cutover migration):
--   * public SELECT on artist_profile and the public_artworks view, which the old portfolio page still reads.

begin;

-- 1. Owner registry ----------------------------------------------------------------------------------------------
create table if not exists public.studio_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.studio_owners enable row level security;
revoke all on public.studio_owners from anon, authenticated;

create or replace function public.is_studio_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.studio_owners where user_id = auth.uid());
$$;
revoke all on function public.is_studio_owner() from public;
grant execute on function public.is_studio_owner() to anon, authenticated;

drop policy if exists "studio_owners_self_read" on public.studio_owners;
create policy "studio_owners_self_read" on public.studio_owners for select to authenticated using (user_id = auth.uid());

-- 2. S2 · artworks: no direct anonymous reads of the base table ---------------------------------------------------
-- Public pages read the public_artworks / website_artworks views, which expose an allow-list of columns.
drop policy if exists "artworks_public_select" on public.artworks;
drop policy if exists "artworks_authenticated_select" on public.artworks;
drop policy if exists "artworks_admin_all" on public.artworks;
create policy "artworks_owner_all" on public.artworks for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 3. S3 · artist_profile: RLS back on; anyone may read (until cutover), only the owner may write ------------------
alter table public.artist_profile enable row level security;
drop policy if exists "artist_profile_public_read" on public.artist_profile;
drop policy if exists "artist_profile_owner_write" on public.artist_profile;
create policy "artist_profile_public_read" on public.artist_profile for select to anon, authenticated using (true);
create policy "artist_profile_owner_write" on public.artist_profile for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());
revoke insert, update, delete, truncate on public.artist_profile from anon;

drop policy if exists "artist_profiles_insert" on public.artist_profiles;
drop policy if exists "artist_profiles_update" on public.artist_profiles;
create policy "artist_profiles_insert" on public.artist_profiles for insert to authenticated with check (public.is_studio_owner());
create policy "artist_profiles_update" on public.artist_profiles for update to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 4. S1 · owner-only writes everywhere that previously trusted any signed-in user ---------------------------------
drop policy if exists "artwork_images_select" on public.artwork_images;
drop policy if exists "artwork_images_insert" on public.artwork_images;
drop policy if exists "artwork_images_update" on public.artwork_images;
drop policy if exists "artwork_images_delete" on public.artwork_images;
create policy "artwork_images_select" on public.artwork_images for select to anon, authenticated
  using (
    public.is_studio_owner()
    or exists (select 1 from public.artworks a where a.id = artwork_images.artwork_id and a.status = 'Available')
  );
create policy "artwork_images_owner_write" on public.artwork_images for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "exhibitions_insert" on public.exhibitions;
drop policy if exists "exhibitions_update" on public.exhibitions;
drop policy if exists "exhibitions_delete" on public.exhibitions;
create policy "exhibitions_owner_write" on public.exhibitions for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "exhibition_artworks_insert" on public.exhibition_artworks;
drop policy if exists "exhibition_artworks_delete" on public.exhibition_artworks;
create policy "exhibition_artworks_owner_write" on public.exhibition_artworks for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to contacts" on public.contacts;
create policy "contacts_owner_all" on public.contacts for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to sales" on public.sales;
create policy "sales_owner_all" on public.sales for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to invoices" on public.invoices;
create policy "invoices_owner_all" on public.invoices for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to reminders" on public.reminders;
create policy "reminders_owner_all" on public.reminders for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow authenticated full access to documents" on public.documents;
create policy "documents_owner_all" on public.documents for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "site_settings_authenticated_read" on public.site_settings;
drop policy if exists "site_settings_authenticated_update" on public.site_settings;
create policy "site_settings_owner_read" on public.site_settings for select to authenticated using (public.is_studio_owner());
create policy "site_settings_owner_update" on public.site_settings for update to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 5. S4 · private rooms: no public listing (passcodes were readable by anyone) ------------------------------------
-- Viewing rooms are opened server-side after the link token is checked.
drop policy if exists "Allow public select on private_rooms" on public.private_rooms;
drop policy if exists "Allow authenticated full access to private_rooms" on public.private_rooms;
create policy "private_rooms_owner_all" on public.private_rooms for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

drop policy if exists "Allow public select on private_room_artworks" on public.private_room_artworks;
drop policy if exists "Allow authenticated full access to private_room_artworks" on public.private_room_artworks;
create policy "private_room_artworks_owner_all" on public.private_room_artworks for all to authenticated
  using (public.is_studio_owner()) with check (public.is_studio_owner());

-- 6. S5 · storage: documents bucket private; uploads and deletes owner-only ---------------------------------------
update storage.buckets set public = false where id = 'documents';

drop policy if exists "Allow public select on documents storage" on storage.objects;
drop policy if exists "Allow authenticated full access to documents storage" on storage.objects;
create policy "documents_storage_owner_all" on storage.objects for all to authenticated
  using (bucket_id = 'documents' and public.is_studio_owner())
  with check (bucket_id = 'documents' and public.is_studio_owner());

drop policy if exists "artwork_images_authenticated_insert" on storage.objects;
drop policy if exists "artwork_images_authenticated_update" on storage.objects;
drop policy if exists "artwork_images_authenticated_delete" on storage.objects;
create policy "artwork_images_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artwork-images' and public.is_studio_owner());
create policy "artwork_images_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'artwork-images' and public.is_studio_owner()) with check (bucket_id = 'artwork-images' and public.is_studio_owner());
create policy "artwork_images_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artwork-images' and public.is_studio_owner());

drop policy if exists "artist_profile_authenticated_insert" on storage.objects;
drop policy if exists "artist_profile_authenticated_update" on storage.objects;
drop policy if exists "artist_profile_authenticated_delete" on storage.objects;
create policy "artist_profile_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artist-profile' and public.is_studio_owner());
create policy "artist_profile_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'artist-profile' and public.is_studio_owner()) with check (bucket_id = 'artist-profile' and public.is_studio_owner());
create policy "artist_profile_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artist-profile' and public.is_studio_owner());

drop policy if exists "artworks_storage_insert" on storage.objects;
drop policy if exists "artworks_storage_update" on storage.objects;
drop policy if exists "artworks_storage_delete" on storage.objects;
create policy "artworks_storage_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'artworks' and public.is_studio_owner());
create policy "artworks_storage_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'artworks' and public.is_studio_owner()) with check (bucket_id = 'artworks' and public.is_studio_owner());
create policy "artworks_storage_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'artworks' and public.is_studio_owner());

commit;

-- ============================================================================
-- 20261025000100_studio_additive_schema.sql
-- ============================================================================
-- Artist Studio · additive schema for the website, CRM, enquiries, invoices, viewing rooms, campaigns and analytics.
-- Only adds columns, tables, views and policies; nothing existing is dropped or renamed.
-- Requires 20261025000000_studio_owner_security.sql (public.is_studio_owner()).
-- Reverse with ../rollback/20261025000100_studio_additive_schema.down.sql.

begin;

-- 1. Artworks: website publishing --------------------------------------------------------------------------------
alter table public.artworks
  add column if not exists slug text,
  add column if not exists is_public boolean;

-- Backfill: only works that are already publicly readable today (status = Available) start out public.
-- Sold, reserved and private works stay off the website until the artist publishes them.
update public.artworks set is_public = (status = 'Available') where is_public is null;
alter table public.artworks alter column is_public set default false;
alter table public.artworks alter column is_public set not null;

-- Stable, readable URLs: title + first 6 characters of the existing ID (IDs are never changed).
update public.artworks
set slug = trim(both '-' from regexp_replace(lower(coalesce(title, 'artwork')), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 6)
where slug is null;
create unique index if not exists artworks_slug_key on public.artworks (slug);

create or replace function public.artworks_set_slug()
returns trigger
language plpgsql
as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := trim(both '-' from regexp_replace(lower(coalesce(new.title, 'artwork')), '[^a-z0-9]+', '-', 'g'))
      || '-' || left(new.id::text, 6);
  end if;
  return new;
end;
$$;
drop trigger if exists artworks_set_slug on public.artworks;
create trigger artworks_set_slug before insert or update of slug on public.artworks
  for each row execute function public.artworks_set_slug();

-- Website projection: an explicit allow-list. Never add cost, insurance_value, notes, internal_notes, location,
-- consignment_location, acquisition_* or provenance here.
create or replace view public.website_artworks as
select
  a.id,
  a.slug,
  a.title,
  a.medium,
  a.dimensions,
  a.year,
  case when a.status in ('Sold') then 'Sold'
       when a.status in ('Reserved', 'On Loan') then 'Reserved'
       else 'Available' end as availability,
  a.series,
  a.category,
  a.collection,
  a.description,
  a.image_url,
  a.is_featured,
  a.featured_order,
  case when a.is_price_visible and a.status = 'Available' then a.price else null end as price,
  a.currency,
  a.created_at,
  a.updated_at
from public.artworks a
where a.is_public = true
  and a.status not in ('Private', 'Archived');

grant select on public.website_artworks to anon, authenticated;

create or replace view public.website_artwork_images as
select i.id, i.artwork_id, i.image_url, i.thumbnail_url, i.alt_text, i.is_primary, i.sort_order
from public.artwork_images i
join public.artworks a on a.id = i.artwork_id
where a.is_public = true and a.status not in ('Private', 'Archived');

grant select on public.website_artwork_images to anon, authenticated;

-- Public artist profile without private contact fields (email, phone, studio_address).
create or replace view public.website_artist_profile as
select
  p.id,
  p.full_name,
  coalesce(p.bio, p.biography) as bio,
  coalesce(p.statement, p.artist_statement) as statement,
  p.location,
  p.nationality,
  p.birth_year,
  p.instagram,
  p.website,
  p.profile_photo_url,
  p.updated_at
from public.artist_profile p;

grant select on public.website_artist_profile to anon, authenticated;

-- 2. Exhibitions: publishing --------------------------------------------------------------------------------------
alter table public.exhibitions
  add column if not exists slug text,
  add column if not exists is_published boolean not null default false,
  add column if not exists cover_image_url text,
  add column if not exists external_url text;

update public.exhibitions
set slug = trim(both '-' from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 6)
where slug is null;
create unique index if not exists exhibitions_slug_key on public.exhibitions (slug);

create or replace view public.website_exhibitions as
select e.id, e.slug, e.title, e.venue, e.location, e.start_date, e.end_date, e.description, e.cover_image_url, e.external_url
from public.exhibitions e
where e.is_published = true;

grant select on public.website_exhibitions to anon, authenticated;

create or replace view public.website_exhibition_artworks as
select ea.exhibition_id, w.*
from public.exhibition_artworks ea
join public.exhibitions e on e.id = ea.exhibition_id and e.is_published = true
join public.website_artworks w on w.id = ea.artwork_id;

grant select on public.website_exhibition_artworks to anon, authenticated;

-- 3. Collectors (existing contacts table) -------------------------------------------------------------------------
alter table public.contacts
  add column if not exists location text,
  add column if not exists interests text[] not null default '{}',
  add column if not exists tags text[] not null default '{}',
  add column if not exists source text,
  add column if not exists consent_marketing boolean not null default false,
  add column if not exists consent_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists last_contacted_at timestamptz;

-- Not unique: existing rows may already contain duplicates. The app de-duplicates by email before inserting.
create index if not exists contacts_email_lower_idx on public.contacts (lower(email));

create table if not exists public.contact_interactions (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'email', 'call', 'meeting', 'enquiry', 'sale', 'viewing_room')),
  summary text not null,
  artwork_id uuid references public.artworks (id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists contact_interactions_contact_idx on public.contact_interactions (contact_id, occurred_at desc);

-- 4. Enquiries ----------------------------------------------------------------------------------------------------
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts (id) on delete set null,
  artwork_id uuid references public.artworks (id) on delete set null,
  name text not null,
  email text not null,
  message text not null,
  source_page text,
  status text not null default 'new' check (status in ('new', 'replied', 'follow_up', 'closed', 'spam')),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_created_idx on public.enquiries (created_at desc);
create index if not exists enquiries_ip_recent_idx on public.enquiries (ip_hash, created_at desc);

-- 5. Invoices: line items and snapshots ---------------------------------------------------------------------------
alter table public.invoices
  add column if not exists contact_id uuid references public.contacts (id) on delete set null,
  add column if not exists currency text not null default 'USD',
  add column if not exists seller jsonb,
  add column if not exists buyer jsonb,
  add column if not exists tax_label text,
  add column if not exists tax_rate numeric(6, 3) not null default 0,
  add column if not exists notes text;

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  artwork_id uuid references public.artworks (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_amount numeric(12, 2) not null,
  sort_order integer not null default 0
);

-- 6. Viewing rooms (existing private_rooms) -----------------------------------------------------------------------
alter table public.private_rooms
  add column if not exists slug text,
  add column if not exists token_hash text,
  add column if not exists contact_id uuid references public.contacts (id) on delete set null,
  add column if not exists revoked_at timestamptz,
  add column if not exists intro text;
create unique index if not exists private_rooms_token_hash_key on public.private_rooms (token_hash) where token_hash is not null;

create table if not exists public.viewing_room_access_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.private_rooms (id) on delete cascade,
  accessed_at timestamptz not null default now(),
  user_agent text
);

-- 7. Email campaign history and analytics ---------------------------------------------------------------------------
create table if not exists public.email_campaign_log (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  recipient_count integer not null,
  dispatch_mode text not null check (dispatch_mode in ('test', 'live')),
  http_status integer,
  succeeded boolean not null default false,
  created_at timestamptz not null default now()
);

-- Consent-aware, anonymous counts only: no names, emails or IP addresses.
create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event text not null check (event in ('page_view', 'artwork_view', 'enquiry', 'newsletter_signup', 'viewing_room_open')),
  path text,
  artwork_id uuid references public.artworks (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists analytics_events_created_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_artwork_idx on public.analytics_events (artwork_id, created_at desc);

-- 8. RLS for the new tables: owner-only. Public writes (enquiries, events, room log) go through validated server
--    routes that use the service role key, so anon gets no table access at all.
alter table public.contact_interactions enable row level security;
alter table public.enquiries enable row level security;
alter table public.invoice_items enable row level security;
alter table public.viewing_room_access_log enable row level security;
alter table public.email_campaign_log enable row level security;
alter table public.analytics_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contact_interactions', 'enquiries', 'invoice_items', 'viewing_room_access_log', 'email_campaign_log', 'analytics_events']
  loop
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

-- ============================================================================
-- 20261030000000_studio_workflows.sql
-- ============================================================================
-- Artist Studio · workflow completion (build pack T08–T13). Additive only; depends on 20261025000000 and 20261025000100.
-- Apply to a Supabase branch/staging copy first. Reverse with ../rollback/20261030000000_studio_workflows.down.sql.

begin;

-- 1. Exhibitions: stable artwork order and an atomic, owner-checked save -------------------------------------------
alter table public.exhibition_artworks add column if not exists position integer not null default 0;
create index if not exists exhibition_artworks_order_idx on public.exhibition_artworks (exhibition_id, position);
alter table public.exhibitions add column if not exists updated_at timestamptz not null default now();

-- Saves the exhibition and its complete ordered membership in one transaction. Rejects unknown artworks, bad dates,
-- non-owners and stale edits (p_expected_updated_at differs from the stored value). Duplicate IDs keep first position.
create or replace function public.save_exhibition(
  p_id uuid,
  p_expected_updated_at timestamptz,
  p_fields jsonb,
  p_artwork_ids uuid[]
)
returns table (exhibition_id uuid, saved_at timestamptz)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_current timestamptz;
  v_now timestamptz := clock_timestamp();
  v_ids uuid[];
  v_missing integer;
  v_start date := nullif(p_fields->>'start_date', '')::date;
  v_end date := nullif(p_fields->>'end_date', '')::date;
  v_title text := btrim(coalesce(p_fields->>'title', ''));
begin
  if not public.is_studio_owner() then
    raise exception 'not_owner' using errcode = '42501';
  end if;
  if v_title = '' then
    raise exception 'title_required' using errcode = '22023';
  end if;
  if v_start is not null and v_end is not null and v_start > v_end then
    raise exception 'end_before_start' using errcode = '22023';
  end if;

  select coalesce(array_agg(a order by first_pos), '{}') into v_ids
  from (select a, min(i) as first_pos from unnest(coalesce(p_artwork_ids, '{}')) with ordinality as t(a, i) group by a) d;

  select count(*) into v_missing from unnest(v_ids) a where not exists (select 1 from public.artworks w where w.id = a);
  if v_missing > 0 then
    raise exception 'unknown_artwork' using errcode = '22023';
  end if;

  if p_id is null then
    insert into public.exhibitions (title, venue, location, start_date, end_date, description, cover_image_url, external_url, is_published, updated_at)
    values (
      v_title, nullif(p_fields->>'venue', ''), nullif(p_fields->>'location', ''), v_start, v_end,
      nullif(p_fields->>'description', ''), nullif(p_fields->>'cover_image_url', ''), nullif(p_fields->>'external_url', ''),
      coalesce((p_fields->>'is_published')::boolean, false), v_now
    )
    returning id into v_id;
  else
    select e.updated_at into v_current from public.exhibitions e where e.id = p_id for update;
    if not found then
      raise exception 'not_found' using errcode = 'P0002';
    end if;
    if p_expected_updated_at is not null and v_current is distinct from p_expected_updated_at then
      raise exception 'stale_edit' using errcode = '40001';
    end if;
    update public.exhibitions set
      title = v_title,
      venue = nullif(p_fields->>'venue', ''),
      location = nullif(p_fields->>'location', ''),
      start_date = v_start,
      end_date = v_end,
      description = nullif(p_fields->>'description', ''),
      cover_image_url = nullif(p_fields->>'cover_image_url', ''),
      external_url = nullif(p_fields->>'external_url', ''),
      is_published = coalesce((p_fields->>'is_published')::boolean, false),
      updated_at = v_now
    where id = p_id;
    v_id := p_id;
  end if;

  delete from public.exhibition_artworks ea where ea.exhibition_id = v_id;
  insert into public.exhibition_artworks (exhibition_id, artwork_id, position)
  select v_id, a, (i - 1)::integer from unnest(v_ids) with ordinality as t(a, i);

  return query select v_id, v_now;
end;
$$;
revoke all on function public.save_exhibition(uuid, timestamptz, jsonb, uuid[]) from public, anon;
grant execute on function public.save_exhibition(uuid, timestamptz, jsonb, uuid[]) to authenticated;

-- Public exhibition artworks follow the curated order (a new column means the view must be recreated).
drop view if exists public.website_exhibition_artworks;
create view public.website_exhibition_artworks as
select ea.exhibition_id, ea.position, w.*
from public.exhibition_artworks ea
join public.exhibitions e on e.id = ea.exhibition_id and e.is_published = true
join public.website_artworks w on w.id = ea.artwork_id;
grant select on public.website_exhibition_artworks to anon, authenticated;

-- 2. Email: server drafts, durable dispatch operations, unsubscribe tokens -----------------------------------------
create table if not exists public.email_campaign_drafts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'campaign' check (kind in ('campaign', 'exhibition_invitation', 'collection_announcement', 'follow_up')),
  title text not null,
  subject text not null default '',
  preview_text text not null default '',
  template_type text not null default 'custom_announcement',
  template_data jsonb not null default '{}'::jsonb,
  raw_html text,
  exhibition_id uuid references public.exhibitions (id) on delete set null,
  artwork_ids uuid[] not null default '{}',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_campaign_drafts_exhibition_idx on public.email_campaign_drafts (exhibition_id, created_at desc);

-- One row per confirmed send. operation_key is generated when the owner confirms; the unique constraint makes
-- double clicks, retries and concurrent requests return the existing operation instead of sending twice.
create table if not exists public.email_dispatch_operations (
  id uuid primary key default gen_random_uuid(),
  operation_key uuid not null unique,
  draft_id uuid references public.email_campaign_drafts (id) on delete set null,
  subject text not null,
  body_sha256 text not null,
  dispatch_mode text not null check (dispatch_mode in ('test', 'live')),
  requested_count integer not null,
  eligible_count integer not null,
  excluded_count integer not null,
  state text not null default 'dispatching' check (state in ('dispatching', 'accepted_by_workflow', 'failed', 'unknown')),
  http_status integer,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_dispatch_operations_created_idx on public.email_dispatch_operations (created_at desc);

-- Opaque unsubscribe tokens: only the SHA-256 hash is stored; the token never contains an email or contact ID.
create table if not exists public.marketing_unsubscribe_tokens (
  token_hash text primary key,
  email_normalized text not null,
  operation_id uuid references public.email_dispatch_operations (id) on delete set null,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index if not exists marketing_unsubscribe_tokens_email_idx on public.marketing_unsubscribe_tokens (email_normalized);

-- 3. Studio settings (single row) ---------------------------------------------------------------------------------
create table if not exists public.studio_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'UTC',
  locale text not null default 'en-GB',
  updated_at timestamptz not null default now()
);
insert into public.studio_settings (id) values (true) on conflict (id) do nothing;

-- 4. RLS: owner-only; anon has no access (public unsubscribe goes through a validated server route) --------------
do $$
declare t text;
begin
  foreach t in array array['email_campaign_drafts', 'email_dispatch_operations', 'marketing_unsubscribe_tokens', 'studio_settings']
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

-- ============================================================================
-- STEP 2 (run separately, AFTER you created the user in Authentication > Users)
-- Replace the email, then run only these lines:
--
--   insert into public.studio_owners (user_id)
--   select id from auth.users where email = 'YOUR-EMAIL@example.com';
--
-- ============================================================================
