import test from 'node:test';
import assert from 'node:assert/strict';
import {
	LEVEL, classifyAlert, townStatus,
} from '../../server/scripts/quad/alert-levels.mjs';

const alert = ({
	id, event, severity = 'Severe', messageType = 'Alert', references = [],
}) => ({
	properties: {
		id, event, severity, messageType, references,
	},
});

test('tornado warning is extreme', () => {
	assert.equal(classifyAlert({ event: 'Tornado Warning', severity: 'Severe' }), LEVEL.EXTREME);
});

test('any Extreme severity is extreme', () => {
	assert.equal(classifyAlert({ event: 'Blizzard Warning', severity: 'Extreme' }), LEVEL.EXTREME);
});

test('winter storm warning with Moderate severity is a warning', () => {
	assert.equal(classifyAlert({ event: 'Winter Storm Warning', severity: 'Moderate' }), LEVEL.WARNING);
});

test('high surf warning is tag only', () => {
	['High Surf Warning', 'Red Flag Warning', 'Heat Warning'].forEach((event) => {
		assert.equal(classifyAlert({ event, severity: 'Moderate' }), LEVEL.TAG);
	});
});

test('extreme severity beats tag-only list', () => {
	assert.equal(classifyAlert({ event: 'Excessive Heat Warning', severity: 'Extreme' }), LEVEL.EXTREME);
});

test('watch and advisory are tags', () => {
	['Winter Storm Watch', 'Wind Advisory', 'Special Weather Statement'].forEach((event) => {
		assert.equal(classifyAlert({ event, severity: 'Minor' }), LEVEL.TAG);
	});
});

test('cancel message is ignored', () => {
	assert.equal(classifyAlert({ event: 'Tornado Warning', messageType: 'Cancel' }), LEVEL.NONE);
});

test('townStatus picks highest unacknowledged', () => {
	const features = [
		alert({ id: 't', event: 'Wind Advisory' }),
		alert({ id: 'f', event: 'Flood Warning' }),
	];
	assert.deepEqual(townStatus(features, {}), {
		level: LEVEL.WARNING, acknowledged: false, label: 'FLOOD WARNING', tags: ['Wind Advisory'],
	});
});

test('townStatus all acknowledged', () => {
	const status = townStatus([alert({ id: 'a', event: 'Flood Warning' })], { a: LEVEL.WARNING });
	assert.equal(status.level, LEVEL.WARNING);
	assert.equal(status.acknowledged, true);
});

test('townStatus empty', () => {
	assert.deepEqual(townStatus([], {}), {
		level: LEVEL.NONE, acknowledged: false, label: '', tags: [],
	});
});

test('acknowledged hurricane does not mute a new lower warning', () => {
	const features = [
		alert({ id: 'h', event: 'Hurricane Warning' }),
		alert({ id: 'f', event: 'Flood Warning' }),
	];
	const status = townStatus(features, { h: LEVEL.EXTREME });
	assert.equal(status.level, LEVEL.WARNING);
	assert.equal(status.acknowledged, false);
	assert.equal(status.label, 'FLOOD WARNING');
});

test('acknowledged warning with only a tag alongside stays acknowledged', () => {
	const features = [
		alert({ id: 'w', event: 'Flood Warning' }),
		alert({ id: 't', event: 'Wind Advisory' }),
	];
	const status = townStatus(features, { w: LEVEL.WARNING });
	assert.equal(status.level, LEVEL.WARNING);
	assert.equal(status.acknowledged, true);
	assert.deepEqual(status.tags, ['Wind Advisory']);
});
