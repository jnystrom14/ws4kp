import test from 'node:test';
import assert from 'node:assert/strict';
import { PANELS, panelUrls } from '../../server/scripts/quad/town-panels.mjs';
import { SCREEN_IDS } from '../../server/scripts/quad/box-url.mjs';
import { TOWNS } from '../../server/scripts/quad/towns.mjs';

const enabled = (url) => {
	const p = new URL(url, 'http://h/').searchParams;
	return SCREEN_IDS.filter((id) => p.get(`${id}-checkbox`) === 'true');
};

test('four panels in reading order: radar, right now, written forecast, the area', () => {
	assert.deepEqual(PANELS.map((panel) => panel.label), ['Radar', 'Right Now', 'Forecast', 'Around Town']);
});

test('each panel shows only its own screens', () => {
	const urls = panelUrls(TOWNS[0]);
	assert.deepEqual(enabled(urls[0]), ['radar']);
	assert.deepEqual(enabled(urls[1]), ['hazards', 'current-weather', 'almanac']);
	assert.deepEqual(enabled(urls[2]), ['local-forecast']);
	assert.deepEqual(enabled(urls[3]), ['latest-observations', 'extended-forecast']);
});

test('every panel is the chosen town and muted', () => {
	panelUrls(TOWNS[3]).forEach((url) => {
		const p = new URL(url, 'http://h/').searchParams;
		assert.equal(p.get('latLonQuery'), 'Poipu, HI');
		assert.equal(p.get('mediaPlaying'), 'false');
	});
});

test('every real screen is covered by the id list', () => {
	assert.equal(SCREEN_IDS.length, 15);
});

test('Poipu gets only the Hawaii radar, so the radar panel does not wait on a radar that never loads', () => {
	assert.deepEqual(enabled(panelUrls(TOWNS[3])[0]), ['hawaii-radar']);
});
