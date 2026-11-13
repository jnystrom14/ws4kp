// Single-town view: the expand button on a box shows only that town; Esc or the
// "All four" button goes back to the grid. The choice is remembered across reloads.

const STORAGE_KEY = 'quadFocus';

const loadFocus = (count) => {
	try {
		const value = window.localStorage.getItem(STORAGE_KEY);
		if (value === null) return null;
		const index = Number(value);
		return Number.isInteger(index) && index >= 0 && index < count ? index : null;
	} catch {
		return null;
	}
};

const saveFocus = (index) => {
	try {
		if (index === null) window.localStorage.removeItem(STORAGE_KEY);
		else window.localStorage.setItem(STORAGE_KEY, String(index));
	} catch {
		// storage unavailable: the choice lasts until reload
	}
};

const setupSingleView = ({
	grid, boxes, wrapper, onChange,
}) => {
	let focused = loadFocus(boxes.length);

	const apply = () => {
		grid.classList.toggle('single', focused !== null);
		boxes.forEach((box, index) => {
			const isFocused = index === focused;
			box.classList.toggle('focused', isFocused);
			const button = box.querySelector('.view-toggle');
			button.textContent = isFocused ? '⤡ All four' : '⤢';
			button.title = isFocused ? 'Back to all four towns' : 'Show only this town';
		});
		saveFocus(focused);
		onChange?.(focused);
	};

	boxes.forEach((box, index) => {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'view-toggle';
		// the click must not reach the box overlay, which acknowledges warnings
		button.addEventListener('click', (event) => {
			event.stopPropagation();
			focused = focused === index ? null : index;
			apply();
			wrapper.focus();
		});
		box.append(button);
	});

	wrapper.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && focused !== null) {
			focused = null;
			apply();
		}
	});

	apply();
	const clear = () => {
		if (focused === null) return;
		focused = null;
		apply();
	};
	return { focusedIndex: () => focused, clear };
};

export default setupSingleView;
