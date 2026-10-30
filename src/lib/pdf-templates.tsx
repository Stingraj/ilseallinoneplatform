/* eslint-disable jsx-a11y/alt-text */
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { ArtistProfileRow, Artwork, Sale } from '@/lib/types/database';
import {
  formatCurrency,
  formatExhibitionHistory,
  formatInstagramHandle,
  getArtworkInventoryNumber,
  getProfileDisplayName,
} from '@/lib/catalog';

const PAGE = {
  portraitWidth: 595.28,
  portraitHeight: 841.89,
  landscapeWidth: 841.89,
  landscapeHeight: 595.28,
};

const FALLBACK_EMAIL = 'ilsemurdock@yahoo.com';

const styles = StyleSheet.create({
  cover: {
    padding: 64,
    backgroundColor: '#ffffff',
    color: '#111111',
    fontFamily: 'Helvetica',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverName: { fontSize: 28, textAlign: 'center', marginBottom: 18 },
  coverContact: { fontSize: 11, lineHeight: 1.6, color: '#555555', textAlign: 'center' },

  artworkPage: {
    paddingTop: 34,
    paddingHorizontal: 38,
    paddingBottom: 34,
    backgroundColor: '#ffffff',
    color: '#111111',
    fontFamily: 'Helvetica',
  },
  artworkImageWrap: {
    width: 519,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  artworkImage: { maxWidth: 519, maxHeight: 565, objectFit: 'contain' },
  noImage: {
    width: 519,
    height: 565,
    backgroundColor: '#f4f4f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkDetails: { width: 519 },
  artworkTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  artworkLine: { fontSize: 10, lineHeight: 1.25, color: '#222222', marginBottom: 1.5 },
  artworkFooter: { position: 'absolute', right: 26, bottom: 18, fontSize: 7, color: '#777777' },

  tablePage: {
    paddingTop: 20,
    paddingHorizontal: 14,
    paddingBottom: 18,
    backgroundColor: '#ffffff',
    color: '#111111',
    fontFamily: 'Helvetica',
  },
  tableTitle: { fontSize: 17, fontFamily: 'Helvetica-Bold', marginBottom: 14 },
  table: { borderTopWidth: 0.8, borderLeftWidth: 0.8, borderColor: '#b8b8b8' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.8, borderColor: '#b8b8b8', minHeight: 73 },
  tableHeaderRow: { minHeight: 16, backgroundColor: '#eeeeee' },
  cell: { borderRightWidth: 0.8, borderColor: '#b8b8b8', padding: 4, justifyContent: 'center' },
  headerCell: { fontSize: 6.8, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
  tableText: { fontSize: 6.7, lineHeight: 1.15 },
  tableImage: { width: 45, height: 50, objectFit: 'contain' },
  tableNoImage: { width: 45, height: 50, backgroundColor: '#f3f3f3' },
});

interface ArtistCatalogPDFProps {
  artworks: Artwork[];
  sales: Sale[];
  profile?: ArtistProfileRow | null;
  showPrice: boolean;
  /** Optional cover heading, e.g. an exhibition title, venue and dates. The default cover is unchanged. */
  coverTitle?: string;
  coverSubtitle?: string;
}

function dash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

function getContactLines(profile?: ArtistProfileRow | null) {
  return [
    profile?.email || FALLBACK_EMAIL,
    profile?.phone || '',
    profile?.studio_address || profile?.location || '',
    profile?.instagram ? formatInstagramHandle(profile.instagram) : '',
  ].filter(Boolean);
}

function CoverPage({ profile, title, subtitle }: { profile?: ArtistProfileRow | null; title?: string; subtitle?: string }) {
  return (
    <Page size="A4" style={styles.cover}>
      {title ? <Text style={styles.coverName}>{title}</Text> : null}
      {subtitle ? <Text style={styles.coverContact}>{subtitle}</Text> : null}
      <Text style={title ? styles.coverContact : styles.coverName}>{getProfileDisplayName(profile)}</Text>
      {getContactLines(profile).map((line) => (
        <Text key={line} style={styles.coverContact}>{line}</Text>
      ))}
    </Page>
  );
}

function getSaleForArtwork(sales: Sale[], artwork: Artwork) {
  return sales.find((item) => item.artwork_id === artwork.id);
}

function ArtworkDetailLines({ artwork, sale, showPrice }: { artwork: Artwork; sale?: Sale; showPrice: boolean }) {
  const priceLine = sale
    ? formatCurrency(sale.sale_price, artwork.currency || undefined)
    : formatCurrency(artwork.price, artwork.currency || undefined);
  const lines = [
    artwork.medium || '',
    artwork.dimensions || '',
    artwork.year ? String(artwork.year) : '',
    showPrice && priceLine ? priceLine : '',
  ].filter(Boolean);

  return (
    <View style={styles.artworkDetails}>
      <Text style={styles.artworkTitle}>{artwork.title}</Text>
      {lines.map((line) => (
        <Text key={line} style={styles.artworkLine}>{line}</Text>
      ))}
    </View>
  );
}

export function ArtistCatalogPDF({ artworks, sales, profile, showPrice, coverTitle, coverSubtitle }: ArtistCatalogPDFProps) {
  return (
    <Document>
      <CoverPage profile={profile} title={coverTitle} subtitle={coverSubtitle} />

      {artworks.map((artwork) => {
        const sale = getSaleForArtwork(sales, artwork);
        return (
          <Page key={artwork.id} size="A4" style={styles.artworkPage} wrap={false}>
            <View style={styles.artworkImageWrap}>
              {artwork.image_url ? (
                <Image src={artwork.image_url} style={styles.artworkImage} />
              ) : (
                <View style={styles.noImage}><Text>No image available</Text></View>
              )}
            </View>
            <ArtworkDetailLines artwork={artwork} sale={sale} showPrice={showPrice} />
            <Text style={styles.artworkFooter} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
          </Page>
        );
      })}
    </Document>
  );
}

function saleInfo(artwork: Artwork, sale: Sale | undefined) {
  if (!sale) {
    return formatCurrency(artwork.price, artwork.currency || undefined) || '-';
  }

  return [
    formatCurrency(sale.sale_price, artwork.currency || undefined),
    sale.commission_percentage ? `Commission ${Number(sale.commission_percentage)}%` : '',
    sale.discount ? `Discount ${Number(sale.discount)}%` : '',
    sale.buyer_name ? `Collector ${sale.buyer_name}` : '',
  ].filter(Boolean).join('\n') || '-';
}

function tableColumns(showPrice: boolean) {
  const columns = [
    { key: 'image', label: 'Image', width: 58 },
    { key: 'im', label: 'IM No.', width: 55 },
    { key: 'title', label: 'Title', width: 80 },
    { key: 'year', label: 'Year', width: 35 },
    { key: 'dimensions', label: 'Dimensions', width: 60 },
    { key: 'media', label: 'Media', width: 72 },
    { key: 'provenance', label: 'Provenance', width: 90 },
    { key: 'exhibitions', label: 'Exhibitions', width: 90 },
    { key: 'publications', label: 'Publications', width: 90 },
    { key: 'location', label: 'Location', width: 60 },
  ];

  if (showPrice) {
    columns.push({ key: 'sale', label: 'Sale Info', width: 105 });
  }

  return columns;
}

export function CatalogTablePDF({ artworks, sales, profile, showPrice }: ArtistCatalogPDFProps) {
  const columns = tableColumns(showPrice);

  return (
    <Document>
      <CoverPage profile={profile} />
      <Page size="A4" orientation="landscape" style={styles.tablePage} wrap>
        <Text style={styles.tableTitle}>Catalog</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeaderRow]} fixed>
            {columns.map((column) => (
              <View key={column.key} style={[styles.cell, { width: column.width }]}>
                <Text style={styles.headerCell}>{column.label}</Text>
              </View>
            ))}
          </View>
          {artworks.map((artwork) => {
            const sale = getSaleForArtwork(sales, artwork);
            const values: Record<string, string> = {
              im: dash(getArtworkInventoryNumber(artwork)),
              title: dash(artwork.title),
              year: dash(artwork.year),
              dimensions: dash(artwork.dimensions),
              media: dash(artwork.medium),
              provenance: dash(artwork.provenance),
              exhibitions: dash(formatExhibitionHistory(artwork.exhibition_history)),
              publications: dash(artwork.publications),
              location: dash(artwork.location || artwork.consignment_location),
              sale: showPrice ? saleInfo(artwork, sale) : '',
            };

            return (
              <View key={artwork.id} style={styles.tableRow} wrap={false}>
                {columns.map((column) => (
                  <View key={column.key} style={[styles.cell, { width: column.width }]}>
                    {column.key === 'image' ? (
                      artwork.image_url ? <Image src={artwork.image_url} style={styles.tableImage} /> : <View style={styles.tableNoImage} />
                    ) : (
                      <Text style={styles.tableText}>{values[column.key] || '-'}</Text>
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </Page>
    </Document>
  );
}
