import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { type HookApi, PLUGIN_ID, decide, register, resolveConfig } from '../src/guard.ts';
import { WEBHOOK_REASON } from '../src/rules.ts';

const webhook = { toolName: 'cron', params: { action: 'add', job: { delivery: { mode: 'webhook', to: 'https://e.x' } } } };
const blocked = { block: true, blockReason: WEBHOOK_REASON };

test('with no config, no agent is exempt', () => {
  assert.deepEqual(resolveConfig(undefined), { allowAgents: [] });
  assert.deepEqual(resolveConfig({}), { allowAgents: [] });
  assert.deepEqual(resolveConfig({ allowAgents: 'ops' }), { allowAgents: [] });
  assert.deepEqual(resolveConfig({ allowAgents: ['ops', '', 3] }), { allowAgents: ['ops'] });
});

test('every agent is blocked, including a call with no agent id', () => {
  const config = resolveConfig({});
  for (const ctx of [{ agentId: 'main' }, { agentId: 'helper' }, {}, undefined]) {
    assert.deepEqual(decide(webhook, ctx, config), blocked, JSON.stringify(ctx));
  }
});

test('only a listed agent is exempt; a missing agent id never matches the list', () => {
  const config = resolveConfig({ allowAgents: ['ops'] });
  assert.equal(decide(webhook, { agentId: 'ops' }, config), undefined);
  assert.deepEqual(decide(webhook, { agentId: 'main' }, config), blocked);
  assert.deepEqual(decide(webhook, {}, config), blocked);
});

test('allowAgents matches the canonical agent id the host passes, whatever case the config uses', () => {
  const config = resolveConfig({ allowAgents: ['Ops'] });
  assert.equal(decide(webhook, { agentId: 'ops' }, config), undefined);
  assert.deepEqual(decide(webhook, { agentId: 'main' }, config), blocked);
});

test('calls that are not scheduling calls pass', () => {
  const config = resolveConfig({});
  assert.equal(decide({ toolName: 'read', params: { path: 'notes.md' } }, { agentId: 'main' }, config), undefined);
  assert.equal(decide({ toolName: 'cron', params: { action: 'list' } }, { agentId: 'main' }, config), undefined);
});

test('register adds one high-priority before_tool_call handler that uses the plugin config', () => {
  const calls: { name: string; handler: Parameters<HookApi['on']>[1]; priority: number }[] = [];
  const api: HookApi = {
    pluginConfig: { allowAgents: ['ops'] },
    on: (name, handler, options) => calls.push({ name, handler, priority: options.priority }),
  };
  register(api);
  assert.equal(calls.length, 1);
  const [call] = calls;
  assert.equal(call?.name, 'before_tool_call');
  assert.equal(call?.priority, 100);
  assert.equal(call?.handler(webhook, { agentId: 'ops' }), undefined);
  assert.deepEqual(call?.handler(webhook, { agentId: 'main' }), blocked);
});

test('the manifest id matches the plugin id', async () => {
  const manifest: unknown = JSON.parse(await readFile(new URL('../openclaw.plugin.json', import.meta.url), 'utf8'));
  assert.ok(typeof manifest === 'object' && manifest !== null && 'id' in manifest);
  assert.equal(manifest.id, PLUGIN_ID);
});
