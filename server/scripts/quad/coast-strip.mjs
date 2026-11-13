// Shows "High 9:46p  Low 3:57p  Surf 3 ft" on the name strip of each coastal town.
// Every element with data-coast="<town name>" gets that town's line.
import {
	COAST, tideUrl, surfUrl, nextTides, surfFeet, coastLine, wallClock,
} from './coast.mjs';

const REFRESH_MS = 30 * 60 * 1000;
const TICK_MS = 60 * 1000;
const TIMEOUT_MS = 20 * 1000;

const getJson = async (url) => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
};

// per town: { predictions, surf }; a failed fetch keeps the last good value
const data = Object.fromEntries(Object.keys(COAST).map((name) => [name, { predictions: null, surf: null }]));

const lineFor = (name) => {
	const coast = COAST[name];
	if (!coast) return '';
	const { predictions, surf } = data[name];
	return coastLine({ ...nextTides(predictions, wallClock(new Date(), coast.tz)), surf });
};

const render = () => {
	document.querySelectorAll('[data-coast]').forEach((el) => {
		el.textContent = lineFor(el.dataset.coast);
	});
};

const refresh = async () => {
	await Promise.all(Object.entries(COAST).map(async ([name, coast]) => {
		const today = wallClock(new Date(), coast.tz).slice(0, 10).replaceAll('-', '');
		const [tides, marine] = await Promise.all([getJson(tideUrl(coast.tideStation, today)), getJson(surfUrl(coast))]);
		if (Array.isArray(tides?.predictions)) data[name].predictions = tides.predictions;
		const surf = surfFeet(marine?.current?.wave_height);
		if (surf !== null) data[name].surf = surf;
	}));
	render();
};

const setupCoast = () => {
	refresh();
	setInterval(refresh, REFRESH_MS);
	// a tide that has passed drops off within a minute
	setInterval(render, TICK_MS);
	return { lineFor };
};

export default setupCoast;
