'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createClient } from '@/lib/supabase/client';
import { MAX_SHARE_FILES, MAX_SHARE_FILE_BYTES, SHARE_BUCKET, shareObjectPath } from '@/lib/shares/paths';
import { formatBytes } from '@/lib/tools/format';
import { createShareAction, registerShareFilesAction } from './actions';

const selectClass = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

export function ShareBuilder({ artworks, contacts }: { artworks: { id: string; title: string }[]; contacts: { id: string; name: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function pickFiles(list: FileList | null) {
    const picked = Array.from(list ?? []);
    const tooBig = picked.filter((f) => f.size > MAX_SHARE_FILE_BYTES);
    if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(', ')}: files must be under ${formatBytes(MAX_SHARE_FILE_BYTES)}.`);
    setFiles(picked.filter((f) => f.size <= MAX_SHARE_FILE_BYTES).slice(0, MAX_SHARE_FILES));
  }

  function submit(formData: FormData) {
    formData.set('file_count', String(files.length));
    startTransition(async () => {
      setLink(null);
      const created = await createShareAction(formData);
      if (!created.success || !created.id) return void toast.error(created.error ?? 'Could not create the share');

      // The share exists from here on, and only the link's hash is stored: always show the link, even if a file fails.
      setLink(created.link ?? null);

      // Files go straight from the browser to private storage (no size limit from the web server in between).
      const failed: string[] = [];
      if (files.length) {
        const supabase = createClient();
        const uploaded: { path: string; name: string; size: number; type: string }[] = [];
        for (const [index, file] of files.entries()) {
          setProgress(`Uploading ${index + 1} of ${files.length}: ${file.name}`);
          const path = shareObjectPath(created.id, index, file.name);
          const { error } = await supabase.storage.from(SHARE_BUCKET).upload(path, file, { contentType: file.type || undefined, upsert: false });
          if (error) failed.push(`${file.name} (${error.message})`);
          else uploaded.push({ path, name: file.name, size: file.size, type: file.type });
        }
        // Register whatever arrived, so every stored file belongs to the share (downloadable, and removed with it).
        if (uploaded.length) {
          setProgress('Finishing…');
          const registered = await registerShareFilesAction(created.id, uploaded);
          if (!registered.success) failed.push(registered.error ?? 'The uploaded files could not be added to the share');
        }
        setProgress(null);
      }

      setFiles([]);
      formRef.current?.reset();
      router.refresh();
      if (failed.length) {
        toast.error(`The share was created, but not everything was added: ${failed.join('; ')}. Copy the link, then delete the share or create a new one if needed.`);
      } else {
        toast.success('Share created');
      }
    });
  }

  return (
    <div className="space-y-5">
      {link && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
          <p className="font-semibold">Copy this link now. For privacy it is shown only once.</p>
          <div className="mt-2 flex gap-2">
            <Input readOnly value={link} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" onClick={() => navigator.clipboard.writeText(link).then(() => toast.success('Link copied'))}>Copy</Button>
          </div>
        </div>
      )}
      <form ref={formRef} action={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="share-title">Title</Label>
          <Input id="share-title" name="title" maxLength={200} placeholder="e.g. Press images for Kunstavisen" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-message">Message (shown on the page)</Label>
          <Textarea id="share-message" name="message" rows={3} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-files">Files</Label>
          <input id="share-files" type="file" multiple onChange={(e) => pickFiles(e.target.files)} className="block w-full text-sm" />
          {files.length > 0 && <p className="text-xs text-slate-500">{files.length} file(s), {formatBytes(files.reduce((sum, f) => sum + f.size, 0))}</p>}
          <p className="text-xs text-slate-500">Up to {MAX_SHARE_FILES} files of {formatBytes(MAX_SHARE_FILE_BYTES)} each.</p>
        </div>
        {artworks.length > 0 && (
          <details className="rounded-md border border-slate-200 p-3">
            <summary className="cursor-pointer text-sm font-medium">Add artwork images from the archive</summary>
            <ul className="mt-3 max-h-56 space-y-1 overflow-auto text-sm">
              {artworks.map((a) => (
                <li key={a.id}>
                  <label className="flex items-center gap-2"><input type="checkbox" name="artwork_ids" value={a.id} /> {a.title}</label>
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="share-expiry">Link expires (optional)</Label>
            <Input id="share-expiry" name="expires_on" type="date" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="share-passcode">Passcode (optional)</Label>
            <Input id="share-passcode" name="passcode" type="text" autoComplete="off" minLength={6} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="share-contact">For a collector (optional)</Label>
          <select id="share-contact" name="contact_id" defaultValue="" className={selectClass}>
            <option value="">Not linked</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {progress && <p role="status" className="text-sm text-slate-600">{progress}</p>}
        <Button type="submit" disabled={pending} className="bg-slate-900 text-white">{pending ? 'Working…' : 'Create share link'}</Button>
      </form>
    </div>
  );
}
