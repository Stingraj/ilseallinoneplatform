'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, EyeOff, Link2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EmptyState } from '@/components/studio/empty-state';
import { moveId } from '@/lib/website/links';
import { addLinkAction, deleteLinkAction, reorderLinksAction, setLinkVisibleAction, updateLinkAction } from './actions';

export interface LinkRow {
  id: string;
  label: string;
  url: string;
  is_visible: boolean;
  sort_order: number;
}

type Result = { success: boolean; error?: string | null };

export function LinkEditor({ initial }: { initial: LinkRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [source, setSource] = useState(initial);
  const [pending, startTransition] = useTransition();
  // router.refresh() re-renders the page with fresh rows: take them over (new links, saved labels, server order).
  if (initial !== source) {
    setSource(initial);
    setRows(initial);
  }

  function run(action: () => Promise<Result>, done: string, rollback?: LinkRow[]) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        if (rollback) setRows(rollback);
        toast.error(result.error ?? 'Something went wrong');
        return;
      }
      toast.success(done);
      router.refresh();
    });
  }

  function move(id: string, direction: 'up' | 'down') {
    const previous = rows;
    const order = moveId(rows.map((row) => row.id), id, direction);
    setRows(order.map((rowId) => rows.find((row) => row.id === rowId)!));
    run(() => reorderLinksAction(order), 'Order saved', previous);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <section className="studio-card p-6 xl:col-span-2" aria-labelledby="add-link">
        <h2 id="add-link" className="mb-5 font-studio text-lg font-semibold">Add a link</h2>
        <form
          action={(formData) => run(() => addLinkAction(formData), 'Link added')}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="link-label">Label</Label>
            <Input id="link-label" name="label" maxLength={80} placeholder="e.g. Prints available now" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="link-url">Web address or email</Label>
            <Input id="link-url" name="url" placeholder="https://… or mailto:you@example.com" required />
          </div>
          <Button type="submit" disabled={pending} className="bg-slate-900 text-white">Add link</Button>
        </form>
      </section>

      <section className="xl:col-span-3" aria-labelledby="your-links">
        <h2 id="your-links" className="sr-only">Your links</h2>
        {rows.length === 0 ? (
          <EmptyState icon={Link2} title="No extra links yet">Add a shop, a gallery, a press article or an event. They appear above the standard links.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {rows.map((row, index) => (
              <LinkItem
                key={row.id}
                row={row}
                first={index === 0}
                last={index === rows.length - 1}
                pending={pending}
                onMove={(direction) => move(row.id, direction)}
                onSave={(label, url) => run(() => updateLinkAction(row.id, label, url), 'Link saved')}
                onToggle={() => {
                  const previous = rows;
                  setRows(rows.map((r) => (r.id === row.id ? { ...r, is_visible: !r.is_visible } : r)));
                  run(() => setLinkVisibleAction(row.id, !row.is_visible), row.is_visible ? 'Link hidden' : 'Link shown', previous);
                }}
                onDelete={() => {
                  if (!window.confirm(`Delete "${row.label}"?`)) return;
                  const previous = rows;
                  setRows(rows.filter((r) => r.id !== row.id));
                  run(() => deleteLinkAction(row.id), 'Link deleted', previous);
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function LinkItem({
  row,
  first,
  last,
  pending,
  onMove,
  onSave,
  onToggle,
  onDelete,
}: {
  row: LinkRow;
  first: boolean;
  last: boolean;
  pending: boolean;
  onMove: (direction: 'up' | 'down') => void;
  onSave: (label: string, url: string) => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(row.label);
  const [url, setUrl] = useState(row.url);
  const dirty = label !== row.label || url !== row.url;
  const icon = 'h-8 w-8 p-0';

  return (
    <li className={`studio-card space-y-3 p-4 ${row.is_visible ? '' : 'opacity-60'}`}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input aria-label="Label" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
        <Input aria-label="Web address" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className={icon} disabled={pending || first} onClick={() => onMove('up')} aria-label={`Move "${row.label}" up`}><ArrowUp className="h-4 w-4" aria-hidden /></Button>
        <Button type="button" variant="outline" className={icon} disabled={pending || last} onClick={() => onMove('down')} aria-label={`Move "${row.label}" down`}><ArrowDown className="h-4 w-4" aria-hidden /></Button>
        <Button type="button" variant="outline" className={icon} disabled={pending} onClick={onToggle} aria-label={row.is_visible ? `Hide "${row.label}"` : `Show "${row.label}"`}>
          {row.is_visible ? <Eye className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
        </Button>
        <Button type="button" variant="outline" className={icon} disabled={pending} onClick={onDelete} aria-label={`Delete "${row.label}"`}><Trash2 className="h-4 w-4" aria-hidden /></Button>
        {!row.is_visible && <span className="text-xs text-slate-500">Hidden from the page</span>}
        {dirty && (
          <Button type="button" size="sm" disabled={pending} className="ml-auto bg-slate-900 text-white" onClick={() => onSave(label, url)}>Save</Button>
        )}
      </div>
    </li>
  );
}
