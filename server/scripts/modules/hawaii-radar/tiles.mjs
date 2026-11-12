// Web Mercator tile math for the RainViewer radar used outside the mainland (Hawaii and Alaska)
// pure functions only, no DOM, so they can be tested in node

// zoom level of the RainViewer tiles, 7 returns real data and shows Kauai at a useful size
export const ZOOM = 7;
// RainViewer serves 256 px tiles
export const TILE_PX = 256;

// longitude and latitude to a pixel on the whole world map at this zoom, [x, y]
export const lonLatToPixel = (lon, lat, zoom) => {
	const worldSize = TILE_PX * (2 ** zoom);
	const sinLat = Math.sin((lat * Math.PI) / 180);
	const x = ((lon + 180) / 360) * worldSize;
	const y = (0.5 - (Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI))) * worldSize;
	return [x, y];
};

// the canvas pixel a longitude and latitude falls on, for a width by height view centred on center
export const projectToView = (center, width, height, zoom) => {
	const [cx, cy] = lonLatToPixel(center.lon, center.lat, zoom);
	const left = cx - (width / 2);
	const top = cy - (height / 2);
	return (lon, lat) => {
		const [x, y] = lonLatToPixel(lon, lat, zoom);
		return [x - left, y - top];
	};
};

// every tile that covers a width by height view centred on lat, lon, with the canvas offset (dx, dy)
// to draw it at. x is wrapped around the date line for the url, dx keeps the unwrapped position
export const tilesForView = (lat, lon, zoom, width, height) => {
	const [cx, cy] = lonLatToPixel(lon, lat, zoom);
	const left = cx - (width / 2);
	const top = cy - (height / 2);
	const count = 2 ** zoom;

	const tiles = [];
	const firstX = Math.floor(left / TILE_PX);
	const lastX = Math.floor((left + width - 1) / TILE_PX);
	const firstY = Math.max(0, Math.floor(top / TILE_PX));
	const lastY = Math.min(count - 1, Math.floor((top + height - 1) / TILE_PX));
	for (let ty = firstY; ty <= lastY; ty += 1) {
		for (let tx = firstX; tx <= lastX; tx += 1) {
			tiles.push({
				x: ((tx % count) + count) % count,
				y: ty,
				dx: (tx * TILE_PX) - left,
				dy: (ty * TILE_PX) - top,
			});
		}
	}
	return tiles;
};
