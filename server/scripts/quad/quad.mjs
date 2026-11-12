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

// Chrome blocks autoplay until the user interacts with the top page. On the first
// pointerdown or keydown, click box 1's own music button (same origin) so its
// play() call counts as user activated. Only used when the music is not yet playing.
const startMusic = () => {
	try {
		const doc = boxes[MUSIC_BOX].querySelector('iframe').contentDocument;
		const container = doc?.getElementById('ToggleMediaContainer');
		const button = doc?.getElementById('ToggleMedia');
		// 'playing' class is off while the app waits for an interaction
		if (button && !container.classList.contains('playing')) button.click();
	} catch {
		// cross-origin or not loaded yet: leave it, autoplay policy applies
	}
};

const setupMusic = () => {
	const wrapper = document.getElementById('wrapper');
	const once = () => {
		wrapper.removeEventListener('pointerdown', once);
		wrapper.removeEventListener('keydown', once);
		startMusic();
	};
	wrapper.addEventListener('pointerdown', once);
	wrapper.addEventListener('keydown', once);
	wrapper.focus();
};

buildGrid();
setupMusic();

export { boxes };
export default boxes;
