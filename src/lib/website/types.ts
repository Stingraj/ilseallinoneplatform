/** What the public website is allowed to know about an artwork. Built only from public views. */
export interface PublicArtwork {
  id: string;
  slug: string;
  title: string;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  availability: 'Available' | 'Reserved' | 'Sold';
  series: string | null;
  category: string | null;
  collection: string | null;
  description: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  featuredOrder: number | null;
  price: number | null;
  currency: string;
}

export interface PublicCollection {
  slug: string;
  name: string;
  count: number;
  cover: PublicArtwork | null;
}

export interface PublicProfile {
  fullName: string | null;
  bio: string | null;
  statement: string | null;
  location: string | null;
  nationality: string | null;
  instagram: string | null;
  website: string | null;
  photoUrl: string | null;
}

export interface PublicExhibition {
  id: string;
  slug: string;
  title: string;
  venue: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
  coverImageUrl: string | null;
  externalUrl: string | null;
}
