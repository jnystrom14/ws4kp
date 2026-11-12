import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colorAtHour, localHour, MODES } from '../../server/scripts/quad/backgrounds.mjs';

test('night, midday and dusk colors hit their key points', () => {
	assert.equal(colorAtHour(0), 'rgb(22, 19, 30)');
	assert.equal(colorAtHour(12), 'rgb(58, 72, 58)');
	assert.equal(colorAtHour(18), 'rgb(102, 56, 24)');
});

test('colors blend between key points', () => {
	// halfway between 12:00 sage and 16:00 olive gold
	assert.equal(colorAtHour(14), 'rgb(64, 69, 52)');
});

test('end of day wraps to night', () => {
	assert.match(colorAtHour(24), /^rgb\(22, 19, 30\)$/);
});

test('local hour follows each time zone', () => {
	const noonUtc = new Date('2026-11-12T12:00:00Z');
	assert.equal(localHour('America/New_York', noonUtc), 7);
	assert.equal(localHour('Pacific/Honolulu', noonUtc), 2);
	assert.equal(localHour('America/Denver', new Date('2026-11-12T19:30:00Z')), 12.5);
});

test('three background styles, town colors first', () => {
	assert.deepEqual(MODES, ['town', 'topo', 'time']);
});
