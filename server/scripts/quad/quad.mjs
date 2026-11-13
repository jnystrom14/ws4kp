import { TOWNS } from './towns.mjs';
import { boxUrl } from './box-url.mjs';
import { fetchTownAlerts, canPruneAcks } from './alerts.mjs';
import { LEVEL, townStatus } from './alert-levels.mjs';
import {
	acknowledgeAll, reconcile, loadAcks, saveAcks,
} from './ack-store.mjs';
import setupMusic from './music.mjs';
import setupSingleView from './single-view.mjs';
import setupTownView from './town-view.mjs';
import { pickTakeover, shouldRestartCycle, POLL_MS } from './takeover.mjs';

// see-through show background, so the grid's backdrop shows around each 4:3 show
const SEE_THROUGH_CSS = 'html, body, body.kiosk, #divTwc { background: transparent !important; }';

const makeSeeThrough = (frame) => {
	try {
		const doc = frame.contentDocument;
		if (!doc || doc.getElementById('four-cast-see-through')) return;
		const style = doc.createElement('style');
		style.id = 'four-cast-see-through';
		style.textContent = SEE_THROUGH_CSS;
		doc.head.append(style);
	} catch {
		// not reachable: keep the show's own background
	}
};

const boxes = [];

const createBox = (town) => {
	const box = document.createElement('div');
	box.className = 'box';
	box.dataset.town = town.name;

	const frame = document.createElement('iframe');
	frame.title = town.name;
	frame.setAttribute('allow', 'autoplay; fullscreen');
	// music is played by the grid page itself (music.mjs), so every box is muted
	frame.src = boxUrl(town, { music: false });
	frame.addEventListener('load', () => makeSeeThrough(frame));

	// always-visible town name under the show
	const name = document.createElement('div');
	name.className = 'town-name';
	name.textContent = town.query;

	const overlay = document.createElement('div');
	overlay.className = 'overlay';

	const bar = document.createElement('div');
	bar.className = 'bar';
	const tag = document.createElement('div');
	tag.className = 'tag-label';
	const ackTag = document.createElement('div');
	ackTag.className = 'ack-label';
	ackTag.textContent = 'ACKNOWLEDGED';

	box.append(frame, name, overlay, bar, tag, ackTag);
	return box;
};

const buildGrid = () => {
	const grid = document.getElementById('grid');
	TOWNS.forEach((town) => {
		const box = createBox(town);
		grid.append(box);
		boxes.push(box);
	});
};

// Alerts: poll NWS, show each box's state, take over the screen for extreme warnings, acknowledge on click or key.
let acks = {};
const features = TOWNS.map(() => []);
let statuses = TOWNS.map(() => townStatus([], {}));
let takeoverCycleStart = 0;
let previousExtreme = [];
const loaded = TOWNS.map(() => false);

const loadStoredAcks = () => {
	try {
		return loadAcks(window.localStorage);
	} catch {
		return {};
	}
};

const persistAcks = () => {
	try {
		saveAcks(window.localStorage, acks);
	} catch {
		// storage unavailable: acknowledgments last until reload
	}
};

const renderBox = (box, status) => {
	const warning = status.level >= LEVEL.WARNING;
	box.classList.toggle('tag', !warning && status.tags.length > 0);
	box.classList.toggle('warning', warning && !status.acknowledged);
	box.classList.toggle('acknowledged', warning && status.acknowledged);
	box.querySelector('.bar').textContent = warning ? status.label : '';
	box.querySelector('.tag-label').textContent = status.tags.join(', ');
};

const extremeBoxes = () => statuses
	.map((status, index) => (status.level === LEVEL.EXTREME && !status.acknowledged ? index : -1))
	.filter((index) => index >= 0);

// set once the single-town and town views are ready; each returns its town's index or null
let singleIndex = () => null;
let townIndex = () => null;
const focusedIndex = () => singleIndex() ?? townIndex();

// in single-town view, unacknowledged warnings for the hidden towns show as a note at the top
const renderHiddenAlerts = () => {
	const note = document.getElementById('hidden-alerts');
	const focused = focusedIndex();
	const lines = focused === null ? [] : statuses
		.map((status, index) => ({ status, index }))
		.filter(({ status, index }) => index !== focused
			&& status.level >= LEVEL.WARNING && !status.acknowledged)
		.map(({ status, index }) => `${TOWNS[index].name.toUpperCase()}: ${status.label}`);
	note.textContent = lines.join('   •   ');
	note.classList.toggle('show', lines.length > 0);
};

const renderAll = () => {
	statuses = TOWNS.map((town, index) => townStatus(features[index], acks));
	boxes.forEach((box, index) => renderBox(box, statuses[index]));
	// the town view carries its own town's alert state around the whole screen
	const town = townIndex();
	renderBox(document.getElementById('town-view'), town === null ? townStatus([], {}) : statuses[town]);
	renderHiddenAlerts();
};

const tickTakeover = () => {
	const list = extremeBoxes();
	if (shouldRestartCycle(previousExtreme, list)) takeoverCycleStart = Date.now();
	previousExtreme = list;
	const active = pickTakeover(Date.now(), takeoverCycleStart, list);
	boxes.forEach((box, index) => box.classList.toggle('takeover', index === active));
};

// a poll that is still running (each fetch can take up to its timeout) makes the next one skip
let polling = false;

const refreshAlerts = async () => {
	if (polling) return;
	polling = true;
	try {
		const results = await Promise.all(TOWNS.map((town) => fetchTownAlerts(town)));
		results.forEach((result, index) => {
			if (result) {
				features[index] = result;
				loaded[index] = true;
			}
		});
		if (canPruneAcks(loaded)) {
			acks = reconcile(features.flat(), acks, Date.now());
			persistAcks();
		}
		renderAll();
		tickTakeover();
	} finally {
		polling = false;
	}
};

// an error in one poll must never become an unhandled rejection, the next poll tries again
const pollAlerts = () => {
	refreshAlerts().catch((error) => console.error('quad: alert poll failed', error));
};

const acknowledge = (index) => {
	if (!boxes[index] || statuses[index].level < LEVEL.WARNING) return;
	acks = acknowledgeAll(features[index], acks);
	persistAcks();
	renderAll();
	tickTakeover();
};

const setupAlerts = () => {
	acks = loadStoredAcks();
	boxes.forEach((box, index) => {
		box.querySelector('.overlay').addEventListener('click', () => acknowledge(index));
	});
	document.getElementById('wrapper').addEventListener('keydown', (event) => {
		if (/^[1-4]$/.test(event.key)) acknowledge(Number(event.key) - 1);
	});
	pollAlerts();
	setInterval(pollAlerts, POLL_MS);
	setInterval(tickTakeover, 1000);
};

buildGrid();
const singleView = setupSingleView({
	grid: document.getElementById('grid'),
	boxes,
	wrapper: document.getElementById('wrapper'),
	onChange: () => renderHiddenAlerts(),
});
singleIndex = singleView.focusedIndex;
({ townIndex } = setupTownView({
	container: document.getElementById('town-view'),
	wrapper: document.getElementById('wrapper'),
	boxes,
	towns: TOWNS,
	onFrameLoad: makeSeeThrough,
	onAcknowledge: (index) => acknowledge(index),
	beforeEnter: () => singleView.clear(),
	onChange: () => renderAll(),
}));
document.getElementById('wrapper').focus();
setupMusic(document.getElementById('wrapper'), document.getElementById('music-hint'));
setupAlerts();

export { boxes };
export default boxes;
