import { DoorOpen } from 'lucide-react';
import { EmptyState } from '@/components/studio/empty-state';
import { PageHeader } from '@/components/studio/page-header';
import { SetupNotice } from '@/components/studio/setup-notice';
import { MIGRATION_HINT, isMissingSchema, requireOwnerPage } from '@/lib/studio/data';
import { roomState } from '@/lib/viewing-rooms/tokens';
import { RoomActions, RoomBuilder } from './room-builder';

export const dynamic = 'force-dynamic';

const STATE_LABEL = { open: 'Open', expired: 'Expired', revoked: 'Revoked', inactive: 'Closed' } as const;

export default async function ViewingRoomsPage() {
  const supabase = await requireOwnerPage();
  const [rooms, artworks, contacts] = await Promise.all([
    supabase.from('private_rooms').select('id, title, expires_at, is_active, revoked_at, passcode, created_at, contacts(name), private_room_artworks(artwork_id), viewing_room_access_log(count)').order('created_at', { ascending: false }),
    supabase.from('artworks').select('id, title, image_url, status').neq('status', 'Archived').order('title'),
    supabase.from('contacts').select('id, name').order('name'),
  ]);
  const schemaMissing = isMissingSchema(rooms.error);
  const secretMissing = !process.env.VIEWING_ROOM_SECRET;

  return (
    <div className="space-y-6">
      <PageHeader title="Viewing rooms" description="Private, unlisted presentations for selected collectors. Links can expire and can be revoked at any time." />
      {schemaMissing && <SetupNotice title="Viewing rooms need the database update">{MIGRATION_HINT}</SetupNotice>}
      {secretMissing && <SetupNotice title="Passcodes are not configured">Set VIEWING_ROOM_SECRET to use passcode-protected rooms. Rooms without a passcode work already.</SetupNotice>}

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="studio-card p-6 xl:col-span-2" aria-labelledby="new-room">
          <h2 id="new-room" className="mb-5 font-studio text-lg font-semibold">New viewing room</h2>
          {schemaMissing ? <p className="text-sm text-slate-500">Available after the database update.</p> : <RoomBuilder artworks={artworks.data ?? []} contacts={contacts.data ?? []} />}
        </section>
        <section className="space-y-3 xl:col-span-3" aria-labelledby="rooms">
          <h2 id="rooms" className="sr-only">Rooms</h2>
          {(rooms.data ?? []).length === 0 ? (
            <EmptyState icon={DoorOpen} title="No viewing rooms yet">Create a private link to share a selection of works with one collector.</EmptyState>
          ) : (
            (rooms.data ?? []).map((room) => {
              const state = roomState(room);
              const contact = Array.isArray(room.contacts) ? room.contacts[0] : room.contacts;
              const opens = (room.viewing_room_access_log as { count: number }[] | null)?.[0]?.count ?? 0;
              return (
                <article key={room.id} className="studio-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${state === 'open' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{STATE_LABEL[state]}</span>
                      {room.passcode && <span className="rounded-full bg-[#F0EAFE] px-2 py-0.5 text-[11px] font-semibold text-slate-700">Passcode</span>}
                    </div>
                    <p className="font-semibold text-slate-900">{room.title}</p>
                    <p className="text-xs text-slate-400">
                      {[contact?.name, `${room.private_room_artworks?.length ?? 0} works`, `${opens} opens`, room.expires_at && `closes ${new Date(room.expires_at).toLocaleDateString('en-GB')}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <RoomActions id={room.id} revoked={state === 'revoked'} />
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
