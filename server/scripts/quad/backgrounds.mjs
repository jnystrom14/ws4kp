// Backgrounds around each show. "B" cycles through the styles; the choice is remembered.
//   town: a color for each place
//   topo: faint contour lines on warm slate
//   time: each box follows its town's local time of day

const STORAGE_KEY = 'quadBackground';
const MODES = ['town', 'topo', 'time'];
const LABELS = {
	town: 'Town colors',
	topo: 'Topographic lines',
	time: 'Time of day',
};

// in TOWNS order: Bolivia marsh, Durango red rock, Sunriver pine, Poipu ocean
const TOWN_COLORS = ['#3b4129', '#4f2617', '#183427', '#0f3c41'];
const TIME_ZONES = ['America/New_York', 'America/Denver', 'America/Los_Angeles', 'Pacific/Honolulu'];

// [hour, color]: the color fades between these points through the day
const DAY_COLORS = [
	[0, [22, 19, 30]], // night: plum charcoal
	[5, [24, 20, 34]],
	[6.5, [78, 42, 58]], // dawn: dusty rose
	[8.5, [74, 72, 60]], // morning: warm stone
	[12, [58, 72, 58]], // midday: sage
	[16, [70, 66, 46]], // afternoon: olive gold
	[18, [102, 56, 24]], // dusk: amber
	[19.5, [60, 30, 40]], // twilight: wine
	[21, [26, 21, 32]], // night
	[24, [22, 19, 30]],
];

const colorAtHour = (hour) => {
	for (let i = 1; i < DAY_COLORS.length; i += 1) {
		const [h1, c1] = DAY_COLORS[i];
		const [h0, c0] = DAY_COLORS[i - 1];
		if (hour <= h1) {
			const t = (hour - h0) / (h1 - h0);
			const mix = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
			return `rgb(${mix.join(', ')})`;
		}
	}
	return `rgb(${DAY_COLORS[0][1].join(', ')})`;
};

const localHour = (timeZone, date = new Date()) => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone, hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
	}).formatToParts(date);
	const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
	const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
	return hour + minute / 60;
};

const loadMode = () => {
	try {
		const saved = window.localStorage.getItem(STORAGE_KEY);
		return MODES.includes(saved) ? saved : MODES[0];
	} catch {
		return MODES[0];
	}
};

const saveMode = (mode) => {
	try {
		window.localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		// storage unavailable: the choice lasts until reload
	}
};

const setupBackgrounds = ({ boxes, wrapper, label }) => {
	let mode = loadMode();
	let labelTimer;

	const paint = () => {
		document.body.dataset.bg = mode;
		boxes.forEach((box, index) => {
			let color = '#23252a';
			if (mode === 'town') color = TOWN_COLORS[index] ?? color;
			if (mode === 'time') color = colorAtHour(localHour(TIME_ZONES[index]));
			box.style.setProperty('--box-color', color);
		});
	};

	const showLabel = () => {
		if (!label) return;
		label.textContent = `Background: ${LABELS[mode]} (press B to change)`;
		label.classList.add('show');
		clearTimeout(labelTimer);
		labelTimer = setTimeout(() => label.classList.remove('show'), 4000);
	};

	wrapper.addEventListener('keydown', (event) => {
		if (event.key !== 'b' && event.key !== 'B') return;
		mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
		saveMode(mode);
		paint();
		showLabel();
	});

	paint();
	// time of day moves slowly; once a minute is plenty
	setInterval(() => {
		if (mode === 'time') paint();
	}, 60000);
};

export { colorAtHour, localHour, MODES };
export default setupBackgrounds;
