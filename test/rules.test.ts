import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { WEBHOOK_REASON, hasWebhookRoute, schedulingBlockReason } from '../src/rules.ts';

test('every webhook route is blocked, on add and update, nested or flattened', () => {
  const routes = [
    { action: 'add', job: { delivery: { mode: 'webhook', to: 'https://example.com/hook' } } },
    { action: 'add', job: { delivery: { mode: 'Webhook ', to: 'x' } } },
    { action: 'update', jobId: 'j', job: { delivery: { failureDestination: { mode: 'webhook', to: 'https://e.x' } } } },
    { action: 'update', jobId: 'j', job: { delivery: { mode: 'announce', completionDestination: { mode: 'webhook', to: 'https://e.x' } } } },
    { action: 'add', job: { failureAlert: { mode: 'webhook', to: 'https://e.x' } } },
    { action: 'add', delivery: { mode: 'webhook', to: 'https://e.x' } },
    { action: 'add', job: { delivery: { mode: 'announce', to: 'https://e.x/collect' } } },
    { action: 'add', job: { webhookUrl: 'https://e.x' } },
    { action: 'add', jobs: [{ delivery: { mode: 'webhook' } }] },
    { action: 'add', schedule: { kind: 'every', everyMs: 60000 }, 'delivery.mode': 'webhook' },
    { action: 'update', jobId: 'j', 'job.delivery.failureDestination.mode': 'webhook' },
    { action: 'add', ' "failureAlert.mode" ': 'webhook' },
    { action: 'add', 'delivery.mode': 'announce', 'delivery.to': 'https://e.x/collect' },
    { action: 'add', job: { delivery: { failureDestination: { to: 'https:e.x/h' } } } },
    { action: 'add', job: { delivery: { failureDestination: { to: ' HTTP:e.x' } } } },
    { action: 'update', jobId: 'j', 'delivery.failureDestination.to': 'https://e.x' },
    { action: 'update', jobId: 'j', ' "job.delivery.to" ': 'https:e.x' },
  ];
  for (const params of routes) {
    assert.equal(schedulingBlockReason('cron', params), WEBHOOK_REASON, JSON.stringify(params));
  }
});

test('the automations alias is guarded the same as cron', () => {
  assert.equal(schedulingBlockReason('automations', { action: 'add', job: { delivery: { mode: 'webhook' } } }), WEBHOOK_REASON);
});

test('chat delivery, reads and removals still work, and a URL or the word webhook outside a route is not a route', () => {
  const allowed = [
    { action: 'add', job: { name: 'r', delivery: { mode: 'announce', channel: 'matrix', to: 'room:x' } } },
    { action: 'add', job: { payload: { kind: 'agentTurn', message: 'read https://e.x later' } } },
    { action: 'update', jobId: 'j', job: { delivery: { failureDestination: null } } },
    { action: 'update', jobId: 'j', job: { webhookUrl: null } },
    { action: 'update', jobId: 'j', 'delivery.to': 'room:x' },
    { action: 'list' },
    { action: 'remove', jobId: 'j' },
    { action: 'run', jobId: 'j' },
    { action: 'get', jobId: 'webhook' },
    { action: 'add', job: { name: 'Webhook', delivery: { mode: 'announce', channel: 'matrix', to: 'room:x' } } },
    { action: 'update', jobId: 'j', job: { webhookEnabled: false } },
  ];
  for (const params of allowed) {
    assert.equal(schedulingBlockReason('cron', params), undefined, JSON.stringify(params));
  }
});

test('a scheduling call it cannot read is blocked rather than passed', () => {
  assert.match(schedulingBlockReason('cron', 'add') ?? '', /no readable parameters/);
  assert.match(schedulingBlockReason('cron', null) ?? '', /no readable parameters/);
  assert.match(schedulingBlockReason('cron', ['add']) ?? '', /no readable parameters/);
});

test('an action the guard does not know is blocked, so an upgrade fails closed', () => {
  assert.match(schedulingBlockReason('cron', { action: 'export' }) ?? '', /unknown scheduling action "export"/);
  assert.match(schedulingBlockReason('cron', {}) ?? '', /unknown scheduling action "undefined"/);
  assert.match(schedulingBlockReason('cron', { action: 7 }) ?? '', /unknown scheduling action "7"/);
});

test('other tools are left alone, whatever their parameters say', () => {
  assert.equal(schedulingBlockReason('exec', { action: 'add', delivery: { mode: 'webhook' } }), undefined);
  assert.equal(schedulingBlockReason('message', { to: 'https://e.x' }), undefined);
});

test('a URL counts as a route only under a `to` key', () => {
  assert.equal(hasWebhookRoute({ to: 'https://e.x' }), true);
  assert.equal(hasWebhookRoute({ note: 'https://e.x' }), false);
  assert.equal(hasWebhookRoute({ to: 'room:x' }), false);
  assert.equal(hasWebhookRoute(42), false);
});
