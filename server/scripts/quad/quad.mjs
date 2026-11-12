import { TOWNS } from './towns.mjs';
import { boxUrl } from './box-url.mjs';

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

	const overlay = document.createElement('div');
	overlay.className = 'overlay';

	box.append(frame, overlay);
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
// as user activated. Returns true once the music is started (or already playing).
const startMusic = () => {
	try {
		const doc = boxes[MUSIC_BOX].querySelector('iframe').contentDocument;
		const container = doc?.getElementById('ToggleMediaContainer');
		const button = doc?.getElementById('ToggleMedia');
		// the button is missing until the app has loaded: report failure so we retry
		if (!container || !button) return false;
		// 'playing' class is off while the app waits for an interaction
		if (!container.classList.contains('playing')) button.click();
		return true;
	} catch {
		// cross-origin: nothing more we can do
		return true;
	}
};

// Listeners stay in place until a start actually succeeds, so a gesture made
// before box 1 has finished loading is not wasted.
const setupMusic = () => {
	const wrapper = document.getElementById('wrapper');
	const attempt = () => {
		if (!startMusic()) return;
		wrapper.removeEventListener('pointerdown', attempt);
		wrapper.removeEventListener('keydown', attempt);
	};
	wrapper.addEventListener('pointerdown', attempt);
	wrapper.addEventListener('keydown', attempt);
	wrapper.focus();
};

buildGrid();
setupMusic();

export { boxes };
export default boxes;
