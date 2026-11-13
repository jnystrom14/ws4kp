import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWNS } from '../../server/scripts/quad/towns.mjs';
import { boxUrl, SCREEN_IDS } from '../../server/scripts/quad/box-url.mjs';

const parse = (x) => new URL(x, 'http://h/');

test('box 1 plays music', () => {
	const { searchParams: p } = parse(boxUrl(TOWNS[0], { music: true }));
	assert.equal(p.get('quad'), '1');
	assert.equal(p.get('kiosk'), 'true');
	assert.equal(p.get('viewMode'), 'standard');
	assert.equal(p.get('mediaPlaying'), 'true');
	assert.equal(p.get('mediaVolume'), '0.75');
	assert.equal(p.get('latLonQuery'), 'Bolivia, NC');
	assert.deepEqual(JSON.parse(p.get('latLon')), { lat: 34.0671, lon: -78.1481 });
});

test('other boxes are muted', () => {
	const { searchParams: p } = parse(boxUrl(TOWNS[3], { music: false }));
	assert.equal(p.get('mediaPlaying'), 'false');
	assert.equal(p.get('mediaVolume'), '0');
});

test('url is relative', () => {
	const u = boxUrl(TOWNS[1], { music: false });
	assert.ok(!u.startsWith('/') && !u.startsWith('http'));
	assert.ok(u.startsWith('index.html?'));
});

test('towns match the spec, in order', () => {
	assert.deepEqual(TOWNS, [
		{
			name: 'Bolivia', query: 'Bolivia, NC', lat: 34.0671, lon: -78.1481,
		},
		{
			name: 'Durango', query: 'Durango, CO', lat: 37.2753, lon: -107.8801,
		},
		{
			name: 'Sunriver', query: 'Sunriver, OR', lat: 43.8840, lon: -121.4386,
		},
		{
			name: 'Poipu', query: 'Poipu, HI', lat: 21.8817, lon: -159.4600,
		},
	]);
});

test('without screens, the show keeps its own choices except the hourly graph, which is off', () => {
	const { searchParams: p } = parse(boxUrl(TOWNS[0], { music: false }));
	assert.equal(p.get('hourly-graph-checkbox'), 'false');
	SCREEN_IDS.filter((id) => id !== 'hourly-graph').forEach((id) => assert.equal(p.get(`${id}-checkbox`), null));
});

test('the hourly graph stays off even when a screen list asks for it', () => {
	const { searchParams: p } = parse(boxUrl(TOWNS[0], { music: false, screens: ['hourly-graph', 'radar'] }));
	assert.equal(p.get('hourly-graph-checkbox'), 'false');
	assert.equal(p.get('radar-checkbox'), 'true');
});

test('with screens, only those screens are on and every other screen is off', () => {
	const { searchParams: p } = parse(boxUrl(TOWNS[0], { music: false, screens: ['radar', 'hawaii-radar'] }));
	assert.equal(p.get('radar-checkbox'), 'true');
	assert.equal(p.get('hawaii-radar-checkbox'), 'true');
	SCREEN_IDS.filter((id) => !['radar', 'hawaii-radar'].includes(id))
		.forEach((id) => assert.equal(p.get(`${id}-checkbox`), 'false', id));
});
