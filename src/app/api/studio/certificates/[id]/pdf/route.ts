import { createElement } from 'react';
import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { getOwnerClient } from '@/lib/auth/require-owner';
import { CertificateDocument } from '@/lib/certificates/certificate-pdf';
import { certificateDetails, type CertificateDetails } from '@/lib/certificates/codes';
import { archiveImageDataUri } from '@/lib/pdf/images';
import { SITE } from '@/lib/site/config';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { client } = await getOwnerClient();
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const { data: certificate } = await client
    .from('artwork_certificates')
    .select('certificate_number, verify_code, details, issued_to, issued_on, revoked_at')
    .eq('id', id)
    .maybeSingle();
  if (!certificate) return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });

  const details: CertificateDetails = { ...certificateDetails({}, SITE.artistName), ...(certificate.details as Partial<CertificateDetails>) };
  const verifyUrl = `${SITE.url}/verify/${certificate.verify_code}`;
  const [qrDataUri, imageDataUri] = await Promise.all([
    QRCode.toDataURL(verifyUrl, { margin: 0, width: 300, errorCorrectionLevel: 'M' }),
    archiveImageDataUri(details.imageUrl),
  ]);

  const pdf = await renderToBuffer(
    createElement(CertificateDocument, {
      data: {
        certificateNumber: certificate.certificate_number,
        issuedOn: certificate.issued_on,
        issuedTo: certificate.issued_to,
        details,
        imageDataUri,
        qrDataUri,
        verifyUrl,
        revoked: Boolean(certificate.revoked_at),
      },
    }) as unknown as Parameters<typeof renderToBuffer>[0]
  );
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${certificate.certificate_number.replace(/[^A-Za-z0-9-]/g, '')}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
