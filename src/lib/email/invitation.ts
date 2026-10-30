/** Builds an Email Studio draft (template 1 fields) from an exhibition. Pure, so it can be tested. */
export interface InvitationInput {
  artistName: string;
  siteUrl: string;
  exhibition: {
    title: string;
    venue: string | null;
    location: string | null;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
    slug: string | null;
    is_published: boolean | null;
    external_url: string | null;
  };
  /** Ordered works; only ones already public on the website may supply the email image. */
  artworks: { id: string; title: string; imageUrl: string | null; isPublic: boolean }[];
}

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));

export function exhibitionDates(start: string | null, end: string | null): string {
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return '';
}

export function buildInvitationDraft(input: InvitationInput) {
  const { exhibition, artistName, siteUrl } = input;
  const where = [exhibition.venue, exhibition.location].filter(Boolean).join(', ');
  const dates = exhibitionDates(exhibition.start_date, exhibition.end_date);
  const hero = input.artworks.find((a) => a.isPublic && a.imageUrl);
  const publicPage = exhibition.is_published && exhibition.slug ? `${siteUrl}/exhibitions/${exhibition.slug}` : null;
  const link = publicPage ?? exhibition.external_url ?? `${siteUrl}/contact`;
  const shown = input.artworks.map((a) => a.title).slice(0, 6);

  const bodyParts = [
    exhibition.description ?? '',
    shown.length ? `Works on show include ${shown.join(', ')}${input.artworks.length > shown.length ? ' and more' : ''}.` : '',
  ].filter(Boolean);

  return {
    subject: `Invitation: ${exhibition.title}`,
    previewText: [dates, where].filter(Boolean).join(' · '),
    templateType: 'custom_announcement',
    templateData: {
      brandName: artistName,
      logoUrl: '',
      headline: exhibition.title,
      subheadline: [dates, where].filter(Boolean).join(' · '),
      body: bodyParts.join('\n\n'),
      imageUrl: hero?.imageUrl ?? '',
      hasButton: true,
      buttonText: publicPage ? 'View the exhibition' : exhibition.external_url ? 'Visit the venue' : 'Contact the studio',
      buttonUrl: link,
      companyName: artistName,
      websiteUrl: siteUrl,
      footerText: 'You are receiving this because you asked to hear about new works and exhibitions.',
      contactInfo: '',
    },
    heroArtworkId: hero?.id ?? null,
  };
}
