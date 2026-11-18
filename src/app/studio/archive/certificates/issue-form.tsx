'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { issueCertificateAction } from './actions';

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function IssueCertificateForm({
  artworks,
  contacts,
  preselected,
}: {
  artworks: { id: string; label: string }[];
  contacts: { id: string; name: string }[];
  preselected?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (artworks.length === 0) return <p className="text-sm text-slate-500">Add the work to the archive first.</p>;

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await issueCertificateAction(formData);
          if (!result.success) return void toast.error(result.error ?? 'Could not issue the certificate');
          toast.success('Certificate issued');
          if (result.id) {
            // A file download, not a page: let the browser fetch the PDF from the owner-only route.
            const link = document.createElement('a');
            link.href = `/api/studio/certificates/${result.id}/pdf`;
            link.download = '';
            link.click();
          }
          router.refresh();
        })
      }
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="coa-artwork">Artwork</Label>
        <select id="coa-artwork" name="artwork_id" defaultValue={artworks.some((a) => a.id === preselected) ? preselected : artworks[0].id} className={selectClass}>
          {artworks.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="coa-contact">Collector (optional)</Label>
        <select id="coa-contact" name="contact_id" defaultValue="" className={selectClass}>
          <option value="">Not linked to a collector</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="coa-issued-to">Name on the certificate (optional)</Label>
        <Input id="coa-issued-to" name="issued_to" maxLength={200} placeholder="Leave empty to use the collector's name, or none" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="coa-date">Issue date</Label>
        <Input id="coa-date" name="issued_on" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>
      <Button type="submit" disabled={pending} className="bg-slate-900 text-white">{pending ? 'Issuing…' : 'Issue and download'}</Button>
    </form>
  );
}
