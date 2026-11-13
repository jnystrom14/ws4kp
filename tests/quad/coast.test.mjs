import test from 'node:test';
import assert from 'node:assert/strict';
import {
	COAST, tideUrl, surfUrl, nextTides, clockTime, surfFeet, coastLine, wallClock,
} from '../../server/scripts/quad/coast.mjs';

const PREDICTIONS = [
	{ t: '2026-11-13 03:08', v: '0.726', type: 'L' },
	{ t: '2026-11-13 09:41', v: '5.146', type: 'H' },
	{ t: '2026-11-13 15:57', v: '0.999', type: 'L' },
	{ t: '2026-11-13 21:46', v: '3.879', type: 'H' },
	{ t: '2026-11-14 04:01', v: '0.600', type: 'L' },
];

test('only the two coastal towns have tides and surf', () => {
	assert.deepEqual(Object.keys(COAST).sort(), ['Bolivia', 'Poipu']);
	assert.equal(COAST.Bolivia.tideStation, '8659182');
	assert.equal(COAST.Poipu.tideStation, '1611347');
});

test('tide url asks NOAA for high/low times in station local time, 2 days from today', () => {
	const u = new URL(tideUrl('8659182', '20261113'));
	assert.equal(u.hostname, 'api.tidesandcurrents.noaa.gov');
	assert.equal(u.searchParams.get('station'), '8659182');
	assert.equal(u.searchParams.get('interval'), 'hilo');
	assert.equal(u.searchParams.get('time_zone'), 'lst_ldt');
	assert.equal(u.searchParams.get('begin_date'), '20261113');
	assert.equal(u.searchParams.get('range'), '48');
	assert.equal(u.searchParams.get('units'), 'english');
});

test('surf url asks for current wave height in feet', () => {
	const u = new URL(surfUrl(COAST.Poipu));
	assert.equal(u.hostname, 'marine-api.open-meteo.com');
	assert.equal(u.searchParams.get('current'), 'wave_height');
	assert.equal(u.searchParams.get('length_unit'), 'imperial');
});

test('next high and next low come after now', () => {
	assert.deepEqual(nextTides(PREDICTIONS, '2026-11-13 10:00'), { high: '2026-11-13 21:46', low: '2026-11-13 15:57' });
	assert.deepEqual(nextTides(PREDICTIONS, '2026-11-13 01:00'), { high: '2026-11-13 09:41', low: '2026-11-13 03:08' });
});

test('a tide happening this minute is still next', () => {
	assert.equal(nextTides(PREDICTIONS, '2026-11-13 09:41').high, '2026-11-13 09:41');
});

test('missing or bad predictions give no tides', () => {
	assert.deepEqual(nextTides(undefined, '2026-11-13 10:00'), { high: null, low: null });
	assert.deepEqual(nextTides([{ t: 'x' }], '2026-11-13 10:00'), { high: null, low: null });
});

test('clock time reads like a person would say it', () => {
	assert.equal(clockTime('2026-11-13 09:41'), '9:41a');
	assert.equal(clockTime('2026-11-13 15:57'), '3:57p');
	assert.equal(clockTime('2026-11-13 00:05'), '12:05a');
	assert.equal(clockTime('2026-11-13 12:30'), '12:30p');
});

test('surf rounds to whole feet and ignores missing data', () => {
	assert.equal(surfFeet(3.28), 3);
	assert.equal(surfFeet(0.2), 0);
	assert.equal(surfFeet(null), null);
	assert.equal(surfFeet(Number.NaN), null);
});

test('coast line shows whatever is known', () => {
	assert.equal(coastLine({ high: '2026-11-13 21:46', low: '2026-11-13 15:57', surf: 3 }), 'High 9:46p  Low 3:57p  Surf 3 ft');
	assert.equal(coastLine({ high: null, low: '2026-11-13 15:57', surf: null }), 'Low 3:57p');
	assert.equal(coastLine({ high: null, low: null, surf: 0 }), 'Surf 0 ft');
	assert.equal(coastLine({ high: null, low: null, surf: null }), '');
});

test('wall clock gives a town\'s local time in the tide format', () => {
	const at = new Date('2026-11-13T18:30:00Z');
	assert.equal(wallClock(at, 'America/New_York'), '2026-11-13 13:30');
	assert.equal(wallClock(at, 'Pacific/Honolulu'), '2026-11-13 08:30');
});
