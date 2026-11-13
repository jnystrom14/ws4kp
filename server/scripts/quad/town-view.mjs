// Town view: the ▦ button on a box fills the screen with four panels for that one town
// (radar, right now, written forecast, around town). Esc or "All four towns" goes back.
// The choice is remembered across reloads.
import { PANELS, panelUrls } from './town-panels.mjs';

const STORAGE_KEY = 'quadTownView';

const loadTown = (count) => {
	try {
		const value = window.localStorage.getItem(STORAGE_KEY);
		if (value === null) return null;
		const index = Number(value);
		return Number.isInteger(index) && index >= 0 && index < count ? index : null;
	} catch {
		return null;
	}
};

const saveTown = (index) => {
	try {
		if (index === null) window.localStorage.removeItem(STORAGE_KEY);
		else window.localStorage.setItem(STORAGE_KEY, String(index));
	} catch {
		// storage unavailable: the choice lasts until reload
	}
};

const setupTownView = ({
	container, wrapper, boxes, towns, onFrameLoad, onAcknowledge, beforeEnter, onChange, coastLine, isCoastal,
}) => {
	let current = null;

	// alert pieces for the whole view: red border, top bar, tags (styled like a box)
	const bar = document.createElement('div');
	bar.className = 'bar';
	const tag = document.createElement('div');
	tag.className = 'tag-label';
	const ackTag = document.createElement('div');
	ackTag.className = 'ack-label';
	ackTag.textContent = 'ACKNOWLEDGED';
	const back = document.createElement('button');
	back.type = 'button';
	back.className = 'view-toggle';
	back.textContent = '⤡ All four towns';
	back.title = 'Back to all four towns';
	const panels = document.createElement('div');
	panels.className = 'panels';
	container.append(panels, bar, tag, ackTag, back);

	const buildPanels = (index) => {
		const town = towns[index];
		const urls = panelUrls(town);
		panels.replaceChildren(...PANELS.map((panel, i) => {
			const box = document.createElement('div');
			box.className = 'panel';
			const frame = document.createElement('iframe');
			frame.title = `${town.name} ${panel.label}`;
			frame.setAttribute('allow', 'autoplay; fullscreen');
			frame.src = urls[i];
			frame.addEventListener('load', () => onFrameLoad?.(frame));
			const name = document.createElement('div');
			name.className = 'town-name';
			const nameText = document.createElement('span');
			// a coastal town's Around Town strip carries tides and surf instead of the
			// town name (the other three strips show it), so the line fits
			const coastal = Boolean(panel.coast && isCoastal?.(town.name));
			nameText.textContent = coastal ? panel.label : `${town.query} · ${panel.label}`;
			name.append(nameText);
			if (coastal) {
				const coast = document.createElement('span');
				coast.className = 'coast';
				coast.dataset.coast = town.name;
				coast.textContent = coastLine?.(town.name) ?? '';
				name.append(coast);
			}
			const overlay = document.createElement('div');
			overlay.className = 'overlay';
			overlay.addEventListener('click', () => onAcknowledge?.(index));
			box.append(frame, name, overlay);
			return box;
		}));
	};

	const apply = () => {
		const on = current !== null;
		wrapper.classList.toggle('town-mode', on);
		container.hidden = !on;
		// panels only exist while the view is open, so four extra shows do not run in the background
		if (on) buildPanels(current);
		else panels.replaceChildren();
		saveTown(current);
		onChange?.(current);
	};

	const show = (index) => {
		if (index !== null) beforeEnter?.();
		current = index;
		apply();
		wrapper.focus();
	};

	boxes.forEach((box, index) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'view-toggle town-toggle';
		button.textContent = '▦';
		button.title = 'Show four views of this town';
		// the click must not reach the box overlay, which acknowledges warnings
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			show(index);
		});
		box.append(button);
	});

	back.addEventListener('click', (event) => {
		event.stopPropagation();
		show(null);
	});

	wrapper.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && current !== null) show(null);
	});

	current = loadTown(towns.length);
	if (current !== null) beforeEnter?.();
	apply();
	return { townIndex: () => current };
};

export default setupTownView;
