import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	pickTakeover, TAKEOVER_MS, CYCLE_MS, POLL_MS,
} from '../../server/scripts/quad/takeover.mjs';

test('constants', () => {
	assert.equal(TAKEOVER_MS, 30000);
	assert.equal(CYCLE_MS, 300000);
	assert.equal(POLL_MS, 180000);
});

test('first slot shows the box', () => {
	assert.equal(pickTakeover(0, 0, [2]), 2);
	assert.equal(pickTakeover(29999, 0, [2]), 2);
});

test('after the slot, null until the next cycle', () => {
	assert.equal(pickTakeover(30000, 0, [2]), null);
	assert.equal(pickTakeover(300000, 0, [2]), 2);
});

test('two level 2 boxes take turns', () => {
	assert.equal(pickTakeover(10000, 0, [1, 3]), 1);
	assert.equal(pickTakeover(40000, 0, [1, 3]), 3);
	assert.equal(pickTakeover(70000, 0, [1, 3]), null);
});

test('no boxes gives null', () => {
	assert.equal(pickTakeover(5, 0, []), null);
});
