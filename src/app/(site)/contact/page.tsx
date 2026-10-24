import type { Metadata } from 'next';
import { EnquiryForm } from '@/components/site/enquiry-form';
import { SITE } from '@/lib/site/config';

export const metadata: Metadata = { title: 'Contact', description: 'Enquiries about works, commissions and exhibitions.' };

export default function ContactPage() {
  return (
    <div className="site-container grid gap-16 pb-28 pt-32 sm:pt-40 lg:grid-cols-12">
      <div className="lg:col-span-5">
        <p className="eyebrow">Contact</p>
        <h1 className="display-xl mt-4">Write to the studio</h1>
        <p className="mt-8 max-w-sm text-[15px] leading-7 text-ink/80">
          For acquisitions, private viewings, commissions, press and exhibitions. Every message is read and answered personally.
        </p>
        <dl className="mt-12 space-y-6 text-sm">
          <div>
            <dt className="eyebrow">Email</dt>
            <dd className="mt-2"><a href={`mailto:${SITE.contactEmail}`} className="link-underline">{SITE.contactEmail}</a></dd>
          </div>
          <div>
            <dt className="eyebrow">Instagram</dt>
            <dd className="mt-2">
              <a href={`https://instagram.com/${SITE.instagram}`} target="_blank" rel="noopener noreferrer" className="link-underline">@{SITE.instagram}</a>
            </dd>
          </div>
        </dl>
      </div>
      <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
        <EnquiryForm sourcePage="/contact" />
      </div>
    </div>
  );
}
