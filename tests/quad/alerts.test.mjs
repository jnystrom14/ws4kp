import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTownAlerts } from '../../server/scripts/quad/alerts.mjs';

const town = { name: 'T', lat: 1.5, lon: -2.5 };

test('returns features on success', async () => {
	const f = { properties: { id: 'a' } };
	let url;
	const fakeFetch = async (u) => {
		url = u;
		return { ok: true, json: async () => ({ features: [f] }) };
	};
	assert.deepEqual(await fetchTownAlerts(town, fakeFetch), [f]);
	assert.match(url, /alerts\/active\?point=1\.5,-2\.5&status=actual/);
});

test('keeps last state when fetch fails', async () => {
	assert.equal(await fetchTownAlerts(town, async () => { throw new Error('x'); }), null);
	assert.equal(await fetchTownAlerts(town, async () => ({ ok: false })), null);
});

test('null when body has no features array', async () => {
	assert.equal(await fetchTownAlerts(town, async () => ({ ok: true, json: async () => ({}) })), null);
});

test('acks are pruned only after every town has loaded', async () => {
	const { canPruneAcks } = await import('../../server/scripts/quad/alerts.mjs');
	assert.equal(canPruneAcks([true, true, true, true]), true);
	assert.equal(canPruneAcks([true, false, true, true]), false);
	assert.equal(canPruneAcks([false, false, false, false]), false);
	assert.equal(canPruneAcks([]), false);
});
