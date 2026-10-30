import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyRecipients, parseAllowlist, summarizeExclusions } from '../../src/lib/email/eligibility.ts';
import { bodyFingerprint, createUnsubscribeToken, hashUnsubscribeToken, isWellFormedUnsubscribeToken, withUnsubscribeFooter, UNSUBSCRIBE_PLACEHOLDER } from '../../src/lib/email/unsubscribe.ts';
import { buildInvitationDraft, exhibitionDates } from '../../src/lib/email/invitation.ts';
import { csvCell, toCsv } from '../../src/lib/studio/csv.ts';

const contacts = [
  { email: 'Anna@Example.com', name: 'Anna', consent_marketing: true, unsubscribed_at: null },
  { email: 'ben@example.com', name: 'Ben', consent_marketing: false, unsubscribed_at: null },
  { email: 'cara@example.com', name: 'Cara', consent_marketing: true, unsubscribed_at: null },
  // A second row for Cara that unsubscribed must suppress the address everywhere.
  { email: 'CARA@example.com', name: 'Cara B', consent_marketing: true, unsubscribed_at: '2026-10-01T00:00:00Z' },
];

test('only consenting, subscribed collectors are eligible, once each', () => {
  const result = classifyRecipients(
    [
      { email: 'anna@example.com', name: '' },
      { email: ' ANNA@example.com ', name: 'Dup' },
      { email: 'ben@example.com', name: 'Ben' },
      { email: 'cara@example.com', name: 'Cara' },
      { email: 'stranger@example.com', name: 'X' },
      { email: 'not-an-email', name: 'Y' },
    ],
    contacts
  );
  assert.deepEqual(result.eligible, [{ email: 'anna@example.com', name: 'Anna' }]);
  assert.deepEqual(result.excluded.map((e) => e.reason), ['duplicate', 'no_marketing_consent', 'unsubscribed', 'not_a_collector', 'invalid_address']);
  assert.match(summarizeExclusions(result.excluded), /1 unsubscribed/);
});

test('test mode only reaches the allowlist', () => {
  const result = classifyRecipients(
    [{ email: 'anna@example.com', name: 'A' }, { email: 'me@studio.test', name: 'Me' }],
    contacts,
    { testAllowlist: parseAllowlist(' me@studio.test , ') }
  );
  assert.deepEqual(result.eligible.map((e) => e.email), ['me@studio.test']);
  assert.equal(result.excluded[0].reason, 'not_in_test_allowlist');
});

test('unsubscribe tokens are random, well formed and stored only as a hash', () => {
  const a = createUnsubscribeToken();
  const b = createUnsubscribeToken();
  assert.notEqual(a.token, b.token);
  assert.ok(isWellFormedUnsubscribeToken(a.token));
  assert.equal(a.tokenHash, hashUnsubscribeToken(a.token));
  assert.ok(!a.tokenHash.includes(a.token));
  assert.equal(isWellFormedUnsubscribeToken('short'), false);
  assert.equal(isWellFormedUnsubscribeToken(`${a.token}<`), false);
});

test('the unsubscribe footer is added once and the fingerprint tracks content', () => {
  const once = withUnsubscribeFooter('<p>Hello</p>');
  assert.ok(once.includes(UNSUBSCRIBE_PLACEHOLDER));
  assert.equal(withUnsubscribeFooter(once), once);
  assert.equal(bodyFingerprint('S', 'B'), bodyFingerprint('S', 'B'));
  assert.notEqual(bodyFingerprint('S', 'B'), bodyFingerprint('S', 'B2'));
});

test('invitation drafts use only public works for the image and link to the public page when published', () => {
  const draft = buildInvitationDraft({
    artistName: 'Ilse',
    siteUrl: 'https://ilse.example',
    exhibition: { title: 'Tidelines', venue: 'Kunsthal', location: 'Aarhus', start_date: '2026-11-05', end_date: '2026-12-20', description: 'New paintings.', slug: 'tidelines', is_published: true, external_url: null },
    artworks: [
      { id: '1', title: 'Private study', imageUrl: 'https://img/private.jpg', isPublic: false },
      { id: '2', title: 'North shore', imageUrl: 'https://img/north.jpg', isPublic: true },
    ],
  });
  assert.equal(draft.subject, 'Invitation: Tidelines');
  assert.equal(draft.templateData.imageUrl, 'https://img/north.jpg');
  assert.equal(draft.templateData.buttonUrl, 'https://ilse.example/exhibitions/tidelines');
  assert.match(draft.previewText, /5 November 2026 – 20 December 2026 · Kunsthal, Aarhus/);
  assert.equal(exhibitionDates(null, null), '');
});

test('unpublished exhibitions never link to a public page', () => {
  const draft = buildInvitationDraft({
    artistName: 'Ilse',
    siteUrl: 'https://ilse.example',
    exhibition: { title: 'Draft show', venue: null, location: null, start_date: null, end_date: null, description: null, slug: 'draft-show', is_published: false, external_url: null },
    artworks: [],
  });
  assert.equal(draft.templateData.buttonUrl, 'https://ilse.example/contact');
  assert.equal(draft.templateData.imageUrl, '');
});

test('CSV export neutralises spreadsheet formulas and quotes properly', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('@SUM'), "'@SUM");
  assert.equal(csvCell(-5), '-5');
  assert.equal(csvCell(null), '');
  assert.equal(toCsv(['a', 'b'], [['x,y', 2]]), 'a,b\r\n"x,y",2\r\n');
});
