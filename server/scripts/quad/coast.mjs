// Tides and surf for the two coastal towns. Pure helpers, safe in node and the browser.
// Tides: NOAA CO-OPS predictions. Surf: Open-Meteo Marine wave height (NOAA buoys block web pages).

const COAST = {
	// Oak Island ocean-side station: the nearest beach to Bolivia
	Bolivia: {
		tideStation: '8659182', tz: 'America/New_York', lat: 33.88, lon: -78.15,
	},
	// Port Allen, Hanapepe Bay: south shore, the nearest station to Poipu
	Poipu: {
		tideStation: '1611347', tz: 'Pacific/Honolulu', lat: 21.86, lon: -159.46,
	},
};

const tideUrl = (station, beginDate) => {
	const params = new URLSearchParams({
		product: 'predictions',
		application: 'four-cast',
		datum: 'MLLW',
		interval: 'hilo',
		units: 'english',
		time_zone: 'lst_ldt',
		format: 'json',
		station,
		begin_date: beginDate,
		range: '48',
	});
	return `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?${params.toString()}`;
};

const surfUrl = ({ lat, lon }) => {
	const params = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lon),
		current: 'wave_height',
		length_unit: 'imperial',
	});
	return `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`;
};

const WALL = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;

// The next high and next low at or after `now`; both are "YYYY-MM-DD HH:MM" in the town's own time.
const nextTides = (predictions, now) => {
	const upcoming = (Array.isArray(predictions) ? predictions : [])
		.filter((p) => WALL.test(p?.t ?? '') && p.t >= now);
	return {
		high: upcoming.find((p) => p.type === 'H')?.t ?? null,
		low: upcoming.find((p) => p.type === 'L')?.t ?? null,
	};
};

// "2026-11-13 15:57" -> "3:57p"
const clockTime = (wall) => {
	const [hours, minutes] = wall.slice(11).split(':').map(Number);
	const hour12 = hours % 12 === 0 ? 12 : hours % 12;
	return `${hour12}:${String(minutes).padStart(2, '0')}${hours < 12 ? 'a' : 'p'}`;
};

const surfFeet = (height) => (typeof height === 'number' && Number.isFinite(height) ? Math.round(height) : null);

const coastLine = ({ high, low, surf }) => [
	high && `High ${clockTime(high)}`,
	low && `Low ${clockTime(low)}`,
	surf !== null && surf !== undefined && `Surf ${surf} ft`,
].filter(Boolean).join('  ');

// A moment as "YYYY-MM-DD HH:MM" on a town's wall clock
const wallClock = (date, timeZone) => {
	const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
		timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
	}).formatToParts(date).map(({ type, value }) => [type, value]));
	return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
};

export {
	COAST, tideUrl, surfUrl, nextTides, clockTime, surfFeet, coastLine, wallClock,
};
