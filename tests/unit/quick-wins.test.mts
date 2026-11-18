import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLink, moveId } from '../../src/lib/website/links.ts';
import { confirmationState, createConfirmToken, hashConfirmToken, isWellFormedConfirmToken } from '../../src/lib/email/confirm.ts';
import { hashUnsubscribeToken } from '../../src/lib/email/unsubscribe.ts';
import { certificateDetails, createVerifyCode, isWellFormedVerifyCode, publicCertificateFields } from '../../src/lib/certificates/codes.ts';
import { nextInvoiceNumber } from '../../src/lib/invoices/totals.ts';
import { addDays, daysBetween, dueReminderStage, isPastDue, normalizeReminderDays, todayIn } from '../../src/lib/invoices/reminders.ts';
import { artworkImagePath, isShareObjectPath, shareObjectPath } from '../../src/lib/shares/paths.ts';
import { passcodeProof, scopedProof } from '../../src/lib/viewing-rooms/tokens.ts';

// Link in bio -------------------------------------------------------------------------------------------------------
test('links accept https and mailto only, upgrading bare and http addresses', () => {
  assert.deepEqual(checkLink(' Shop ', 'shop.example.com'), { ok: true, value: { label: 'Shop', url: 'https://shop.example.com/' } });
  assert.deepEqual(checkLink('Old', 'http://example.com/a'), { ok: true, value: { label: 'Old', url: 'https://example.com/a' } });
  assert.deepEqual(checkLink('Mail', 'mailto:studio@example.com'), { ok: true, value: { label: 'Mail', url: 'mailto:studio@example.com' } });
  assert.equal(checkLink('X', 'javascript:alert(1)').ok, false);
  assert.equal(checkLink('X', 'data:text/html,hi').ok, false);
  assert.equal(checkLink('X', 'ftp://example.com').ok, false);
  assert.equal(checkLink('X', 'localhost').ok, false);
  assert.equal(checkLink('', 'https://example.com').ok, false);
  assert.equal(checkLink('X', 'mailto:not-an-address').ok, false);
  assert.equal(checkLink('x'.repeat(81), 'https://example.com').ok, false);
});

test('moving a link swaps it with its neighbour and ignores moves past the ends', () => {
  assert.deepEqual(moveId(['a', 'b', 'c'], 'b', 'up'), ['b', 'a', 'c']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'b', 'down'), ['a', 'c', 'b']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'a', 'up'), ['a', 'b', 'c']);
  assert.deepEqual(moveId(['a', 'b', 'c'], 'z', 'down'), ['a', 'b', 'c']);
});

// Double opt-in -----------------------------------------------------------------------------------------------------
test('confirmation tokens are random, well-formed and never valid as unsubscribe tokens', () => {
  const a = createConfirmToken();
  const b = createConfirmToken();
  assert.notEqual(a.token, b.token);
  assert.ok(isWellFormedConfirmToken(a.token));
  assert.equal(a.tokenHash, hashConfirmToken(a.token));
  assert.notEqual(hashConfirmToken(a.token), hashUnsubscribeToken(a.token));
  assert.ok(!isWellFormedConfirmToken('short'));
  assert.ok(!isWellFormedConfirmToken(undefined));
});

test('a confirmation is pending until confirmed, and expires', () => {
  const now = new Date('2026-11-18T12:00:00Z');
  assert.equal(confirmationState({ confirmed_at: null, expires_at: '2026-11-20T00:00:00Z' }, now), 'pending');
  assert.equal(confirmationState({ confirmed_at: null, expires_at: '2026-11-17T00:00:00Z' }, now), 'expired');
  assert.equal(confirmationState({ confirmed_at: '2026-11-16T00:00:00Z', expires_at: '2026-11-17T00:00:00Z' }, now), 'confirmed');
});

// Certificates ------------------------------------------------------------------------------------------------------
test('verify codes are random and 16 URL-safe characters', () => {
  const code = createVerifyCode();
  assert.ok(isWellFormedVerifyCode(code));
  assert.notEqual(code, createVerifyCode());
  assert.ok(!isWellFormedVerifyCode('../../etc/passwd'));
});

test('certificate details snapshot the artwork and format editions', () => {
  const details = certificateDetails({ title: ' Morning Light ', year: 2024, medium: 'Oil on linen', edition_number: '3', edition_size: '25', image_url: '' }, 'Ilse');
  assert.equal(details.title, 'Morning Light');
  assert.equal(details.year, '2024');
  assert.equal(details.edition, '3 / 25');
  assert.equal(details.imageUrl, null);
  assert.equal(certificateDetails({ edition_size: '10' }, '').edition, 'Edition of 10');
  assert.equal(certificateDetails({}, '').title, 'Untitled');
});

test('the public verify page never receives private certificate fields', () => {
  const fields = publicCertificateFields({ title: 'T', artist: 'A', inventoryNumber: 'INV-9', signature: 'signed verso' } as never);
  assert.deepEqual(Object.keys(fields).sort(), ['artist', 'dimensions', 'edition', 'imageUrl', 'medium', 'title', 'year']);
  assert.equal(publicCertificateFields(null).title, null);
});

test('numbers are sequential per prefix and year', () => {
  const existing = ['INV-2026-004', 'Q-2026-009', 'COA-2026-001', 'INV-2025-020'];
  assert.equal(nextInvoiceNumber(existing, 2026), 'INV-2026-005');
  assert.equal(nextInvoiceNumber(existing, 2026, 'Q'), 'Q-2026-010');
  assert.equal(nextInvoiceNumber(existing, 2026, 'COA'), 'COA-2026-002');
  assert.equal(nextInvoiceNumber(existing, 2027, 'Q'), 'Q-2027-001');
});

// Reminders ---------------------------------------------------------------------------------------------------------
test('reminder days are cleaned, sorted and capped', () => {
  assert.deepEqual(normalizeReminderDays([21, 3, '10', 3, 0, -1, 400, 2.5]), [3, 10, 21]);
  assert.deepEqual(normalizeReminderDays('nope'), []);
  assert.equal(normalizeReminderDays(Array.from({ length: 20 }, (_, i) => i + 1)).length, 10);
});

test('the right reminder stage is due, once, and never several at once', () => {
  const days = [3, 10, 21];
  assert.equal(dueReminderStage('2026-11-10', '2026-11-12', days, []), null); // 2 days overdue
  assert.equal(dueReminderStage('2026-11-10', '2026-11-13', days, []), 1); // 3 days
  assert.equal(dueReminderStage('2026-11-10', '2026-11-14', days, [1]), null); // already sent
  assert.equal(dueReminderStage('2026-11-10', '2026-11-22', days, []), 2); // missed stage 1: only stage 2
  assert.equal(dueReminderStage('2026-11-10', '2026-11-22', days, [2]), null);
  assert.equal(dueReminderStage('2026-11-10', '2026-12-31', days, [1, 2]), 3);
  assert.equal(dueReminderStage('2026-11-10', '2026-12-31', days, [3]), null);
  assert.equal(dueReminderStage(null, '2026-12-31', days, []), null);
  assert.equal(dueReminderStage('2026-11-10', '2026-11-09', days, []), null);
});

test('date helpers follow the calendar and the studio time zone', () => {
  assert.equal(daysBetween('2026-11-10', '2026-11-13'), 3);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2); // across a DST change
  assert.equal(addDays('2026-12-25', 14), '2027-01-08');
  assert.ok(isPastDue('2026-11-10', '2026-11-11'));
  assert.ok(!isPastDue('2026-11-10', '2026-11-10'));
  assert.ok(!isPastDue(null, '2026-11-10'));
  const lateUtc = new Date('2026-11-18T23:30:00Z');
  assert.equal(todayIn('UTC', lateUtc), '2026-11-18');
  assert.equal(todayIn('Europe/Copenhagen', lateUtc), '2026-11-19');
  assert.equal(todayIn('Not/AZone', lateUtc), '2026-11-18');
});

// File sharing ------------------------------------------------------------------------------------------------------
test('share files live only directly inside their own share folder', () => {
  const id = '3f2a1b4c-0000-4000-8000-000000000001';
  const path = shareObjectPath(id, 2, '../../Press kit (final).pdf');
  assert.equal(path, `shares/${id}/2-Press-kit-final-.pdf`); // traversal and brackets stripped by safeFileName
  assert.ok(isShareObjectPath(id, path));
  assert.ok(!isShareObjectPath(id, `shares/${id}/../other/x.pdf`));
  assert.ok(!isShareObjectPath(id, `shares/${id}/sub/x.pdf`));
  assert.ok(!isShareObjectPath(id, `shares/3f2a1b4c-0000-4000-8000-000000000002/x.pdf`));
  assert.ok(!isShareObjectPath(id, `private/${id}/x.pdf`));
  assert.ok(!isShareObjectPath('not-a-uuid', 'shares/not-a-uuid/x.pdf'));
  assert.throws(() => shareObjectPath('../x', 0, 'a.pdf'));
});

test('artwork images are only taken from this project\'s public artwork bucket', () => {
  const base = 'https://abc.supabase.co';
  assert.equal(artworkImagePath(`${base}/storage/v1/object/public/artwork-images/works/a%20b.jpg`, base), 'works/a b.jpg');
  assert.equal(artworkImagePath(`https://evil.example/storage/v1/object/public/artwork-images/x.jpg`, base), null);
  assert.equal(artworkImagePath(`${base}/storage/v1/object/public/documents/x.pdf`, base), null);
  assert.equal(artworkImagePath(null, base), null);
});

test('share passcode proofs differ from viewing-room proofs for the same id', () => {
  assert.notEqual(scopedProof('file-share', 'id-1', 's'), passcodeProof('id-1', 's'));
  assert.notEqual(scopedProof('file-share', 'id-1', 's'), scopedProof('file-share', 'id-2', 's'));
});
