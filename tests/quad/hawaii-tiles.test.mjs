import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	ZOOM, TILE_PX, lonLatToPixel, tilesForView,
} from '../../server/scripts/modules/hawaii-radar/tiles.mjs';

const POIPU = { lat: 21.8817, lon: -159.46 };

test('zoom is 7 and tiles are 256 px', () => {
	assert.equal(ZOOM, 7);
	assert.equal(TILE_PX, 256);
});

test('Poipu falls in tile 7,56 at zoom 7', () => {
	const [x, y] = lonLatToPixel(POIPU.lon, POIPU.lat, 7);
	assert.deepEqual([Math.floor(x / 256), Math.floor(y / 256)], [7, 56]);
});

test('lonLatToPixel puts 0,0 at the middle of the world', () => {
	const [x, y] = lonLatToPixel(0, 0, 0);
	assert.ok(Math.abs(x - 128) < 1e-9);
	assert.ok(Math.abs(y - 128) < 1e-9);
});

test('tilesForView covers a 640x367 view centred on Poipu', () => {
	const tiles = tilesForView(POIPU.lat, POIPU.lon, 7, 640, 367);
	assert.ok(tiles.some((t) => t.x === 7 && t.y === 56), 'includes tile 7,56');

	const [cx, cy] = lonLatToPixel(POIPU.lon, POIPU.lat, 7);
	tiles.forEach((t) => {
		// where the centre point lands on the canvas when this tile is drawn at dx,dy
		const px = t.dx + (cx - (t.x * 256));
		const py = t.dy + (cy - (t.y * 256));
		assert.ok(Math.abs(px - 320) <= 1, `tile ${t.x},${t.y} puts centre x at ${px}`);
		assert.ok(Math.abs(py - 183.5) <= 1, `tile ${t.x},${t.y} puts centre y at ${py}`);
	});

	const keys = tiles.map((t) => `${t.x},${t.y}`);
	assert.equal(new Set(keys).size, keys.length, 'no duplicate tiles');
});

test('tilesForView covers the whole view with no gaps', () => {
	const tiles = tilesForView(POIPU.lat, POIPU.lon, 7, 640, 367);
	// every corner and the centre of the canvas is inside some tile
	[[0, 0], [639, 0], [0, 366], [639, 366], [320, 183]].forEach(([px, py]) => {
		const covered = tiles.some((t) => px >= t.dx && px < t.dx + 256 && py >= t.dy && py < t.dy + 256);
		assert.ok(covered, `canvas pixel ${px},${py} is covered`);
	});
	// and no tile lies wholly off the canvas
	tiles.forEach((t) => {
		assert.ok(t.dx < 640 && t.dx + 256 > 0 && t.dy < 367 && t.dy + 256 > 0, `tile ${t.x},${t.y} is on the canvas`);
	});
});
