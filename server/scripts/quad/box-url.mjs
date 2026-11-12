// Relative URL (no leading slash) so the site works when served from a subpath.
const boxUrl = (town, { music }) => {
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
	return `index.html?${params.toString()}`;
};

export { boxUrl };
export default boxUrl;
