'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Download, FileText, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareInvitationDraftAction } from './actions';

/** Builds the exhibition catalogue with the existing PDF engine, in the curated order, and previews it first. */
export function CatalogueAction({ artworkIds, title, subtitle, fileName }: { artworkIds: string[]; title: string; subtitle: string; fileName: string }) {
  const [state, setState] = useState<{ status: 'idle' | 'working' | 'ready' | 'error'; url?: string; message?: string }>({ status: 'idle' });
  useEffect(() => () => {
    if (state.url) URL.revokeObjectURL(state.url);
  }, [state.url]);

  async function generate() {
    setState({ status: 'working' });
    try {
      const res = await fetch('/api/generate-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkIds, sortOrder: 'custom', coverTitle: title, coverSubtitle: subtitle, fileName }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `The catalogue could not be generated (HTTP ${res.status}).`);
      }
      const url = URL.createObjectURL(await res.blob());
      setState({ status: 'ready', url });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : 'The catalogue could not be generated.' });
    }
  }

  if (artworkIds.length === 0) return <p className="text-sm text-[color:var(--studio-muted)]">Add artworks to the exhibition to build its catalogue.</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={generate} disabled={state.status === 'working'}>
          <FileText className="mr-2 h-4 w-4" aria-hidden />
          {state.status === 'working' ? 'Building catalogue…' : state.status === 'ready' ? 'Rebuild catalogue' : 'Generate catalogue'}
        </Button>
        {state.status === 'ready' && state.url && (
          <Button asChild variant="outline">
            <a href={state.url} download={`${fileName}.pdf`}><Download className="mr-2 h-4 w-4" aria-hidden />Download PDF</a>
          </Button>
        )}
      </div>
      {state.status === 'error' && <p role="alert" className="rounded-xl bg-[#FCECEC] p-3 text-sm text-[#A12D2D]">{state.message}</p>}
      {state.status === 'ready' && state.url && (
        <iframe src={state.url} title="Catalogue preview" className="h-[70vh] w-full rounded-xl border border-[color:var(--studio-line)] bg-white" />
      )}
    </div>
  );
}

/** Opens (or creates) the exhibition's invitation draft in Email Studio. Never sends. */
export function InvitationAction({ exhibitionId, hasDraft }: { exhibitionId: string; hasDraft: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const open = (mode: 'reuse' | 'new') =>
    startTransition(async () => {
      setError(null);
      const result = await prepareInvitationDraftAction(exhibitionId, mode);
      if (!result.success) return void setError(result.error ?? 'The invitation draft could not be prepared.');
      router.push(`/studio/email?draft=${result.draftId}&from=${exhibitionId}`);
    });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => open('reuse')} disabled={pending}>
          <Mail className="mr-2 h-4 w-4" aria-hidden />
          {pending ? 'Preparing…' : hasDraft ? 'Open latest invitation draft' : 'Prepare invitation draft'}
        </Button>
        {hasDraft && (
          <Button type="button" variant="outline" onClick={() => open('new')} disabled={pending}>Start a new draft</Button>
        )}
      </div>
      <p className="text-xs text-[color:var(--studio-muted)]">
        The draft opens in <Link href="/studio/email" className="underline">Email Studio</Link>. Choose recipients and confirm there; nothing is sent from here.
      </p>
      {error && <p role="alert" className="rounded-xl bg-[#FCECEC] p-3 text-sm text-[#A12D2D]">{error}</p>}
    </div>
  );
}
