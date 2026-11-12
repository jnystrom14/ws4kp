import test from 'node:test';
import assert from 'node:assert/strict';
import { TOWNS } from '../../server/scripts/quad/towns.mjs';
import { boxUrl } from '../../server/scripts/quad/box-url.mjs';

const parse = (x) => new URL(x, 'http://h/');

test('box 1 plays music', () => {
	const { searchParams: p } = parse(boxUrl(TOWNS[0], { music: true }));
	assert.equal(p.get('quad'), '1');
	assert.equal(p.get('kiosk'), 'true');
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
