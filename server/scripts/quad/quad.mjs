import { TOWNS } from './towns.mjs';
import { boxUrl } from './box-url.mjs';
import { fetchTownAlerts, canPruneAcks } from './alerts.mjs';
import { LEVEL, townStatus } from './alert-levels.mjs';
import {
	acknowledgeAll, reconcile, loadAcks, saveAcks,
} from './ack-store.mjs';
import { pickTakeover, shouldRestartCycle, POLL_MS } from './takeover.mjs';

const MUSIC_BOX = 0;

const boxes = [];

const createBox = (town, index) => {
	const box = document.createElement('div');
	box.className = 'box';
	box.dataset.town = town.name;

	const frame = document.createElement('iframe');
	frame.title = town.name;
	frame.setAttribute('allow', 'autoplay; fullscreen');
	frame.src = boxUrl(town, { music: index === MUSIC_BOX });

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
	TOWNS.forEach((town, index) => {
		const box = createBox(town, index);
		grid.append(box);
		boxes.push(box);
	});
};

// Chrome blocks autoplay until the user interacts with the top page. On a pointerdown
// or keydown, click box 1's own music button (same origin) so its play() call counts
// as user activated. Success means box 1's container has the `playing` class.
const CHECK_DELAY_MS = 400;

const musicElements = () => {
	const doc = boxes[MUSIC_BOX].querySelector('iframe').contentDocument;
	return {
		container: doc?.getElementById('ToggleMediaContainer'),
		button: doc?.getElementById('ToggleMedia'),
	};
};

// Resolves true when the music is playing (or can never be started from here),
// false when a later gesture should try again.
const startMusic = async () => {
	try {
		const { container, button } = musicElements();
		// the app has not finished loading yet
		if (!container || !button) return false;
		// never click while playing: that would turn the music off
		if (container.classList.contains('playing')) return true;
		button.click();
		await new Promise((resolve) => {
			setTimeout(resolve, CHECK_DELAY_MS);
		});
		// the click is lost if the app had not wired its handler yet
		return musicElements().container?.classList.contains('playing') === true;
	} catch (error) {
		// a cross-origin frame can never be started from here, so stop trying;
		// anything else (frame not ready) is transient
		return error?.name === 'SecurityError';
	}
};

// Listeners stay in place until a start actually succeeds, so a gesture made
// before box 1 has finished loading is not wasted.
const setupMusic = () => {
	const wrapper = document.getElementById('wrapper');
	let busy = false;
	const attempt = async () => {
		// a second gesture during the check must not click again
		if (busy) return;
		busy = true;
		const started = await startMusic();
		busy = false;
		if (!started) return;
		wrapper.removeEventListener('pointerdown', attempt);
		wrapper.removeEventListener('keydown', attempt);
	};
	wrapper.addEventListener('pointerdown', attempt);
	wrapper.addEventListener('keydown', attempt);
	wrapper.focus();
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

const renderAll = () => {
	statuses = TOWNS.map((town, index) => townStatus(features[index], acks));
	boxes.forEach((box, index) => renderBox(box, statuses[index]));
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
setupMusic();
setupAlerts();

export { boxes };
export default boxes;
