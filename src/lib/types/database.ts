export interface ArtistProfile {
  id: string;
  name?: string | null;
  full_name?: string | null;
  pronouns?: string | null;
  birth_year?: number | null;
  nationality?: string | null;
  location?: string | null;
  bio: string | null;
  statement: string | null;
  website: string | null;
  website_url?: string | null;
  email: string | null;
  instagram: string | null;
  phone?: string | null;
  studio_address?: string | null;
  profile_image_url?: string | null;
  profile_photo_url?: string | null;
  hero_image_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Artwork {
  id: string;
  inventory_number?: string | null;
  title: string;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  price?: number | string | null;
  sale_price?: number | string | null;
  is_price_visible?: boolean | null;
  is_featured?: boolean | null;
  featured_order?: number | null;
  currency?: string | null;
  status: string;
  series?: string | null;
  category?: string | null;
  collection?: string | null;
  on_consignment?: boolean | null;
  consignment_location?: string | null;
  provenance?: string | null;
  exhibition_history?: string[] | string | null;
  publications?: string | null;
  location?: string | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Sale {
  id: string;
  artwork_id: string | null;
  contact_id?: string | null;
  buyer_name?: string | null;
  sale_price: number | string | null;
  commission_percentage?: number | string | null;
  discount?: number | string | null;
  sale_date: string | null;
  status: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
  artworks?: Pick<Artwork, 'id' | 'title' | 'inventory_number' | 'image_url' | 'year'> | null;
}

export interface ArtistProfileRow {
  id: string;
  full_name: string | null;
  pronouns: string | null;
  birth_year: number | null;
  nationality: string | null;
  location: string | null;
  instagram: string | null;
  website: string | null;
  website_url?: string | null;
  email: string | null;
  phone?: string | null;
  studio_address?: string | null;
  statement: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  updated_at: string;
}
