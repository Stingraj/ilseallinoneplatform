import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { CertificateDetails } from './codes';

export interface CertificateDocumentData {
  certificateNumber: string;
  issuedOn: string;
  issuedTo: string | null;
  details: CertificateDetails;
  imageDataUri: string | null;
  qrDataUri: string;
  verifyUrl: string;
  revoked: boolean;
}

const styles = StyleSheet.create({
  page: { padding: 56, fontSize: 10, fontFamily: 'Helvetica', color: '#1C1B1A' },
  frame: { flex: 1, borderWidth: 0.75, borderColor: '#B9B2A9', padding: 36 },
  eyebrow: { fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: '#8A857F', textAlign: 'center' },
  heading: { fontSize: 26, fontFamily: 'Times-Roman', textAlign: 'center', marginTop: 8, marginBottom: 28 },
  body: { flexDirection: 'row', gap: 24 },
  image: { width: 190, height: 220, objectFit: 'contain' },
  details: { flex: 1 },
  title: { fontSize: 18, fontFamily: 'Times-Italic', marginBottom: 14 },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#D8D3CC', paddingVertical: 5 },
  label: { width: 90, fontSize: 8, textTransform: 'uppercase', letterSpacing: 1, color: '#8A857F', paddingTop: 1 },
  value: { flex: 1 },
  statement: { marginTop: 28, lineHeight: 1.6, fontFamily: 'Times-Roman', fontSize: 11 },
  footer: { marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  signLine: { width: 220, borderTopWidth: 0.75, borderTopColor: '#1C1B1A', paddingTop: 5, marginTop: 40 },
  muted: { color: '#8A857F', fontSize: 8 },
  qr: { width: 78, height: 78 },
  revoked: { position: 'absolute', top: 260, left: 60, right: 60, textAlign: 'center', fontSize: 48, color: '#B42318', opacity: 0.35, transform: 'rotate(-20deg)' },
});

export function CertificateDocument({ data }: { data: CertificateDocumentData }) {
  const d = data.details;
  const rows: [string, string | null][] = [
    ['Artist', d.artist],
    ['Year', d.year],
    ['Medium', d.medium],
    ['Dimensions', d.dimensions],
    ['Edition', d.edition],
    ['Signature', d.signature],
    ['Inventory no.', d.inventoryNumber],
  ];

  return (
    <Document title={`Certificate of Authenticity ${data.certificateNumber}`} author={d.artist}>
      <Page size="A4" style={styles.page}>
        <View style={styles.frame}>
          <Text style={styles.eyebrow}>{d.artist}</Text>
          <Text style={styles.heading}>Certificate of Authenticity</Text>

          <View style={styles.body}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop */}
            {data.imageDataUri ? <Image src={data.imageDataUri} style={styles.image} /> : null}
            <View style={styles.details}>
              <Text style={styles.title}>{d.title}</Text>
              {rows.filter(([, value]) => value).map(([label, value]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.label}>{label}</Text>
                  <Text style={styles.value}>{value}</Text>
                </View>
              ))}
            </View>
          </View>

          <Text style={styles.statement}>
            I certify that the work described above is an original work of art created by me, {d.artist}
            {data.issuedTo ? `, and that this certificate was issued to ${data.issuedTo}` : ''}.
          </Text>

          <View style={styles.footer}>
            <View>
              <View style={styles.signLine}><Text>{d.artist}</Text></View>
              <Text style={styles.muted}>Signature and date</Text>
              <Text style={[styles.muted, { marginTop: 12 }]}>Certificate {data.certificateNumber} · issued {data.issuedOn}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf Image has no alt prop */}
              <Image src={data.qrDataUri} style={styles.qr} />
              <Text style={styles.muted}>Scan to verify</Text>
              <Text style={styles.muted}>{data.verifyUrl}</Text>
            </View>
          </View>
        </View>
        {data.revoked ? <Text style={styles.revoked}>REVOKED</Text> : null}
      </Page>
    </Document>
  );
}
