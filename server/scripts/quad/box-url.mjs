// Every screen the show has, by its id. A box can be limited to some of them.
const SCREEN_IDS = [
	'hazards', 'current-weather', 'latest-observations', 'hourly', 'hourly-graph',
	'travel', 'regional-forecast', 'local-forecast', 'extended-forecast', 'almanac',
	'spc-outlook', 'climate', 'radar', 'future-radar', 'hawaii-radar',
];

// Screens Jen turned off everywhere (she finds the hourly graph not useful).
const NEVER_SCREENS = ['hourly-graph'];

// Relative URL (no leading slash) so the site works when served from a subpath.
// With `screens`, only those screens are on; without it, the show keeps its own choices.
const boxUrl = (town, { music, screens }) => {
	const params = new URLSearchParams({
		quad: '1',
		kiosk: 'true',
		// standard 4:3 show, no extended side art (calm on the eyes)
		viewMode: 'standard',
		latLonQuery: town.query,
		latLon: JSON.stringify({ lat: town.lat, lon: town.lon }),
		mediaPlaying: String(!!music),
		mediaVolume: music ? '0.75' : '0',
	});
	if (screens) {
		SCREEN_IDS.forEach((id) => params.set(`${id}-checkbox`, String(screens.includes(id) && !NEVER_SCREENS.includes(id))));
	} else {
		NEVER_SCREENS.forEach((id) => params.set(`${id}-checkbox`, 'false'));
	}
	return `index.html?${params.toString()}`;
};

export { boxUrl, SCREEN_IDS, NEVER_SCREENS };
export default boxUrl;
