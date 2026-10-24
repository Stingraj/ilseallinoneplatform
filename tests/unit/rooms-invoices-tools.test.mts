import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRoomToken, hashRoomToken, isWellFormedToken, passcodeProof, roomState, safeEqual } from '../../src/lib/viewing-rooms/tokens.ts';
import { invoiceTotals, nextInvoiceNumber } from '../../src/lib/invoices/totals.ts';
import { formatBytes, safeFileName, savingPercent } from '../../src/lib/tools/format.ts';
import { isStudioOwner } from '../../src/lib/auth/owner.ts';

test('room tokens are random, well-formed, and stored only as hashes', () => {
  const a = createRoomToken();
  const b = createRoomToken();
  assert.notEqual(a.token, b.token);
  assert.ok(isWellFormedToken(a.token));
  assert.equal(a.tokenHash, hashRoomToken(a.token));
  assert.notEqual(a.tokenHash, a.token);
  assert.ok(!isWellFormedToken('../../etc/passwd'));
});

test('room state honours revocation and expiry', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  assert.equal(roomState({ is_active: true, revoked_at: null, expires_at: null }, now), 'open');
  assert.equal(roomState({ is_active: true, revoked_at: '2026-10-01', expires_at: null }, now), 'revoked');
  assert.equal(roomState({ is_active: true, revoked_at: null, expires_at: '2026-10-24T00:00:00Z' }, now), 'expired');
  assert.equal(roomState({ is_active: false, revoked_at: null, expires_at: null }, now), 'inactive');
});

test('passcode proof is bound to the room and the secret', () => {
  assert.notEqual(passcodeProof('room-1', 's'), passcodeProof('room-2', 's'));
  assert.notEqual(passcodeProof('room-1', 's'), passcodeProof('room-1', 't'));
  assert.ok(safeEqual('abc', 'abc'));
  assert.ok(!safeEqual('abc', 'abd'));
  assert.ok(!safeEqual('abc', 'abcd'));
});

test('invoice totals round to cents and add tax only when set', () => {
  assert.deepEqual(invoiceTotals([{ description: 'Painting', quantity: 1, unit_amount: 1999.99 }], 0), { subtotal: 1999.99, tax: 0, total: 1999.99 });
  assert.deepEqual(invoiceTotals([{ description: 'P', quantity: 1, unit_amount: 1000 }, { description: 'Discount', quantity: 1, unit_amount: -100 }], 19), { subtotal: 900, tax: 171, total: 1071 });
});

test('invoice numbers are sequential per year', () => {
  assert.equal(nextInvoiceNumber([], 2026), 'INV-2026-001');
  assert.equal(nextInvoiceNumber(['INV-2026-001', 'INV-2026-009', 'INV-2025-044', 'legacy-7'], 2026), 'INV-2026-010');
});

test('file helpers', () => {
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5.0 MB');
  assert.equal(savingPercent(1000, 250), 75);
  assert.equal(safeFileName('../../Ilse Catalogue (final).pdf'), 'Ilse-Catalogue-final-.pdf');
  assert.equal(safeFileName('///'), 'file');
});

test('only listed owner emails may use the studio', () => {
  const previous = process.env.STUDIO_OWNER_EMAILS;
  delete process.env.STUDIO_OWNER_EMAILS;
  assert.equal(isStudioOwner({ email: 'anyone@example.com' }), false);
  process.env.STUDIO_OWNER_EMAILS = 'Ilse@Example.com, studio@example.com';
  assert.equal(isStudioOwner({ email: 'ilse@example.com' }), true);
  assert.equal(isStudioOwner({ email: 'stranger@example.com' }), false);
  assert.equal(isStudioOwner(null), false);
  if (previous === undefined) delete process.env.STUDIO_OWNER_EMAILS; else process.env.STUDIO_OWNER_EMAILS = previous;
});
