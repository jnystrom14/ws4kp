import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { songLabel } from '../../server/scripts/quad/music.mjs';

test('songLabel shows the plain name for album tracks', () => {
	assert.equal(songLabel('default/Moonlit sky.mp3'), '♫ Moonlit sky');
});

test('songLabel credits Kevin MacLeod tracks', () => {
	assert.equal(
		songLabel('default/Lobby Time.mp3'),
		'♫ Lobby Time · Kevin MacLeod (incompetech.com), CC BY 4.0',
	);
});

test('every credited track is in the music folder', () => {
	['Smooth Lovin', 'Airport Lounge', 'Lobby Time', 'Bossa Antigua'].forEach((name) => {
		assert.ok(fs.existsSync(`server/music/default/${name}.mp3`), name);
	});
});
