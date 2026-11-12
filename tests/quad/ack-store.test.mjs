import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL } from '../../server/scripts/quad/alert-levels.mjs';
import {
	isAcknowledged, acknowledgeAll, reconcile, loadAcks, saveAcks,
} from '../../server/scripts/quad/ack-store.mjs';

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
	const acks = { old: LEVEL.WARNING };
	const feature = alert({ id: 'new', event: 'Winter Storm Warning', references: [{ identifier: 'old' }] });
	assert.equal(isAcknowledged(feature.properties, acks), true);
	assert.equal(reconcile([feature], acks).new, LEVEL.WARNING);
});

test('escalation is not inherited', () => {
	const acks = { old: LEVEL.WARNING };
	const feature = alert({ id: 'new', event: 'Hurricane Warning', references: [{ identifier: 'old' }] });
	assert.equal(isAcknowledged(feature.properties, acks), false);
});

test('new unrelated alert is not acknowledged', () => {
	const feature = alert({ id: 'b', event: 'Flood Warning' });
	assert.equal(isAcknowledged(feature.properties, { a: LEVEL.EXTREME }), false);
});

test('prunes acks for alerts no longer active', () => {
	const acks = { gone: LEVEL.WARNING, live: LEVEL.WARNING };
	const features = [alert({ id: 'live', event: 'Flood Warning' })];
	assert.deepEqual(reconcile(features, acks), { live: LEVEL.WARNING });
});

test('acknowledgeAll records each alert at its level', () => {
	const features = [
		alert({ id: 'x', event: 'Flood Warning' }),
		alert({ id: 'y', event: 'Wind Advisory' }),
	];
	assert.deepEqual(acknowledgeAll(features, {}), { x: LEVEL.WARNING, y: LEVEL.TAG });
});

test('load and save round-trip', () => {
	const storage = fakeStorage();
	assert.deepEqual(loadAcks(storage), {});
	saveAcks(storage, { a: LEVEL.WARNING });
	assert.deepEqual(loadAcks(storage), { a: LEVEL.WARNING });
	storage.setItem('quadAcks', '{not json');
	assert.deepEqual(loadAcks(storage), {});
});
