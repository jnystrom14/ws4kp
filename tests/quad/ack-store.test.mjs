import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL } from '../../server/scripts/quad/alert-levels.mjs';
import {
	isAcknowledged, acknowledgeAll, reconcile, loadAcks, saveAcks, ACK_UNSEEN_MS,
} from '../../server/scripts/quad/ack-store.mjs';

const NOW = 1_800_000_000_000;
const ack = (level, lastSeen = NOW) => ({ level, lastSeen });

const alert = ({
	id, event, severity = 'Severe', messageType = 'Alert', references = [],
}) => ({
	properties: {
		id, event, severity, messageType, references,
	},
});

const fakeStorage = () => {
	const map = new Map();
	return {
		getItem: (key) => (map.has(key) ? map.get(key) : null),
		setItem: (key, value) => map.set(key, value),
	};
};

test('update inherits acknowledgment', () => {
	const acks = { old: ack(LEVEL.WARNING, NOW - 1000) };
	const feature = alert({ id: 'new', event: 'Winter Storm Warning', references: [{ identifier: 'old' }] });
	assert.equal(isAcknowledged(feature.properties, acks), true);
	assert.deepEqual(reconcile([feature], acks, NOW).new, ack(LEVEL.WARNING, NOW));
});

test('escalation is not inherited', () => {
	const acks = { old: ack(LEVEL.WARNING) };
	const feature = alert({ id: 'new', event: 'Hurricane Warning', references: [{ identifier: 'old' }] });
	assert.equal(isAcknowledged(feature.properties, acks), false);
});

test('new unrelated alert is not acknowledged', () => {
	const feature = alert({ id: 'b', event: 'Flood Warning' });
	assert.equal(isAcknowledged(feature.properties, { a: ack(LEVEL.EXTREME) }), false);
});

test('alert missing from one poll keeps its ack', () => {
	const flood = alert({ id: 'p1', event: 'Hurricane Warning' });
	let acks = acknowledgeAll([flood], {}, NOW);
	acks = reconcile([], acks, NOW + 60_000);
	assert.deepEqual(acks, { p1: ack(LEVEL.EXTREME, NOW) });
	acks = reconcile([flood], acks, NOW + 120_000);
	assert.equal(isAcknowledged(flood.properties, acks), true);
	assert.deepEqual(acks, { p1: ack(LEVEL.EXTREME, NOW + 120_000) });
});

test('ack pruned after 24h unseen', () => {
	assert.equal(ACK_UNSEEN_MS, 24 * 60 * 60 * 1000);
	const acks = { gone: ack(LEVEL.WARNING, NOW), live: ack(LEVEL.WARNING, NOW) };
	const features = [alert({ id: 'live', event: 'Flood Warning' })];
	assert.deepEqual(reconcile(features, acks, NOW + ACK_UNSEEN_MS - 1), {
		gone: ack(LEVEL.WARNING, NOW), live: ack(LEVEL.WARNING, NOW + ACK_UNSEEN_MS - 1),
	});
	assert.deepEqual(reconcile(features, acks, NOW + ACK_UNSEEN_MS), {
		live: ack(LEVEL.WARNING, NOW + ACK_UNSEEN_MS),
	});
});

test('acknowledgeAll records each alert at its level', () => {
	const features = [
		alert({ id: 'x', event: 'Flood Warning' }),
		alert({ id: 'y', event: 'Wind Advisory' }),
	];
	assert.deepEqual(acknowledgeAll(features, {}, NOW), { x: ack(LEVEL.WARNING), y: ack(LEVEL.TAG) });
});

test('load and save round-trip', () => {
	const storage = fakeStorage();
	assert.deepEqual(loadAcks(storage, NOW), {});
	saveAcks(storage, { a: ack(LEVEL.WARNING, NOW - 5) });
	assert.deepEqual(loadAcks(storage, NOW), { a: ack(LEVEL.WARNING, NOW - 5) });
	storage.setItem('quadAcks', '{not json');
	assert.deepEqual(loadAcks(storage), {});
});

test('legacy numeric ack loads', () => {
	const storage = fakeStorage();
	storage.setItem('quadAcks', JSON.stringify({ a: LEVEL.EXTREME, bad: 'x', b: ack(LEVEL.WARNING, NOW - 9) }));
	const acks = loadAcks(storage, NOW);
	assert.deepEqual(acks, { a: ack(LEVEL.EXTREME, NOW), b: ack(LEVEL.WARNING, NOW - 9) });
	assert.equal(isAcknowledged(alert({ id: 'a', event: 'Hurricane Warning' }).properties, acks), true);
});
