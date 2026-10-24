import { test } from 'node:test';
import assert from 'node:assert/strict';
import { campaignPayloadSchema, n8nHeaders, resolveDispatchTarget } from '../../src/lib/email/dispatch.ts';

test('sending is disabled unless a mode is set explicitly', () => {
  assert.equal(resolveDispatchTarget({}).url, null);
  assert.equal(resolveDispatchTarget({ EMAIL_DISPATCH_MODE: 'LIVE-ish', N8N_CAMPAIGN_WEBHOOK_URL: 'https://n8n.example/live' }).url, null);
});

test('test mode never uses the live webhook', () => {
  const target = resolveDispatchTarget({
    EMAIL_DISPATCH_MODE: 'test',
    N8N_CAMPAIGN_WEBHOOK_URL: 'https://n8n.example/live',
    N8N_TEST_WEBHOOK_URL: 'https://n8n.example/test',
  });
  assert.deepEqual(target, { mode: 'test', url: 'https://n8n.example/test' });
  assert.equal(resolveDispatchTarget({ EMAIL_DISPATCH_MODE: 'test', N8N_CAMPAIGN_WEBHOOK_URL: 'https://n8n.example/live' }).url, null);
});

test('live mode requires https (localhost allowed for local n8n)', () => {
  assert.equal(resolveDispatchTarget({ EMAIL_DISPATCH_MODE: 'live', N8N_CAMPAIGN_WEBHOOK_URL: 'http://n8n.example/x' }).url, null);
  assert.equal(resolveDispatchTarget({ EMAIL_DISPATCH_MODE: 'live', N8N_CAMPAIGN_WEBHOOK_URL: 'http://localhost:5678/webhook/email-campaign' }).url, 'http://localhost:5678/webhook/email-campaign');
});

test('the n8n payload keeps the Email Studio contract', () => {
  const payload = { contacts: [{ email: 'a@example.com', name: 'A' }], subject: 'Hello', body: '<p>Hi</p>' };
  assert.deepEqual(campaignPayloadSchema.parse(payload), payload);
  assert.equal(campaignPayloadSchema.safeParse({ ...payload, contacts: [] }).success, false);
  assert.equal(campaignPayloadSchema.safeParse({ ...payload, contacts: [{ email: 'nope', name: '' }] }).success, false);
});

test('secret header only when configured', () => {
  assert.equal(n8nHeaders({})['X-Studio-Secret'], undefined);
  assert.equal(n8nHeaders({ N8N_WEBHOOK_SECRET: 's3cret' })['X-Studio-Secret'], 's3cret');
});
