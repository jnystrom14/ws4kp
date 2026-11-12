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

buildGrid();
setupMusic();

export { boxes };
export default boxes;
