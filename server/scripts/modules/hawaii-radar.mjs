// radar loop for Hawaii and Alaska, which the mainland radar (built on a CONUS base map) skips
// frames come from RainViewer (free, no key) drawn over a land map made from Natural Earth data
// for every other state this display reports no data and is skipped
import STATUS from './status.mjs';
import { DateTime } from '../vendor/auto/luxon.mjs';
import WeatherDisplay from './weatherdisplay.mjs';
import FilmstripWeatherDisplay from './filmstrip-weather-display.mjs';
import { registerDisplay } from './navigation.mjs';
import { timeZone } from './location.mjs';
import { debugFlag } from './utils/debug.mjs';
import fetchImageBlob from './utils/fetch-image-blob.mjs';
import { RADAR_FINAL_SIZE } from './radar/constants.mjs';
import {
	ZOOM, TILE_PX, tilesForView, projectToView,
} from './hawaii-radar/tiles.mjs';
import { drawLand, drawCoast } from './hawaii-radar/land.mjs';

const FRAME_LIST_URL = 'https://api.rainviewer.com/public/weather-maps.json';
// relative so it works when the site is served from a subpath
const LAND_URL = 'data/hawaii-land.json';
const STATES = ['HI', 'AK'];

// the land polygons never change, load them once
let landPromise = null;
const getLand = () => {
	landPromise ??= fetch(LAND_URL)
		.then((response) => {
			if (!response.ok) throw new Error(`Unable to load ${LAND_URL}: ${response.status}`);
			return response.json();
		})
		.then((geojson) => geojson.coordinates)
		.catch((error) => {
			landPromise = null;
			throw error;
		});
	return landPromise;
};

// decoded tiles by url, so a refresh or a change of display mode only downloads new frames
let tileCache = new Map();

// a tile that fails to load is drawn as empty (no rain), not as a failure of the whole frame
const loadTile = (url) => {
	if (!tileCache.has(url)) {
		tileCache.set(url, fetchImageBlob(url)
			.then((blob) => createImageBitmap(blob))
			.catch((error) => {
				if (debugFlag('verbose-failures')) console.warn(`HawaiiRadar: tile ${url} failed (${error.message})`);
				tileCache.delete(url);
				return null;
			}));
	}
	return tileCache.get(url);
};

class HawaiiRadar extends FilmstripWeatherDisplay {
	constructor(navId, elemId) {
		super(navId, elemId, 'Hawaii/Alaska Radar', {
			imageMax: 6,
			startOnLastFrame: true,
		});
		this.buildId = 0;
	}

	// replaces the parent's getData: the parent stops for HI and AK, this display runs only for them
	async getData(weatherParameters, refresh) {
		if (!WeatherDisplay.prototype.getData.call(this, weatherParameters, refresh)) return;

		if (!STATES.includes(this.weatherParameters.state)) {
			this.timing.totalScreens = 0;
			this.setStatus(STATUS.noData);
			return;
		}

		// a newer call (refresh or change of mode) replaces this one
		this.buildId += 1;
		const myBuild = this.buildId;

		const size = RADAR_FINAL_SIZE();
		this.view = { radarFinalSize: size };

		let images;
		try {
			images = await this.getImages(size);
		} catch (error) {
			if (myBuild !== this.buildId) return;
			if (debugFlag('verbose-failures')) console.warn(`HawaiiRadar: ${error.message}`);
			images = [];
		}
		if (myBuild !== this.buildId) return;

		if (images.length === 0) {
			this.timing.totalScreens = 0;
			if (this.isEnabled) this.setStatus(STATUS.failed);
			return;
		}

		const radarInfo = images.map((radar) => ({
			time: radar.timestamp.setZone(timeZone()),
			elem: this.fillTemplate('frame', { map: { type: 'canvas', canvas: radar.canvas } }),
		}));

		if (debugFlag(this.elemId)) {
			radarInfo.forEach(({ time }, index) => {
				console.log(`HawaiiRadar: frame ${index} ${time.toLocaleString(DateTime.TIME_SIMPLE)} ${time.zoneName}`);
			});
		}

		const scrollArea = this.elem.querySelector('.scroll-area');
		scrollArea.innerHTML = '';
		scrollArea.append(...radarInfo.map((r) => r.elem));
		scrollArea.style.transform = '';

		this.timing.totalScreens = radarInfo.length;
		this.times = radarInfo.map((radar) => radar.time);
		this.setStatus(STATUS.loaded);
	}

	// the last imageMax RainViewer frames, oldest first, each drawn as one canvas: land, radar, coastline
	async getImages(size) {
		const [frameList, polygons] = await Promise.all([
			fetch(FRAME_LIST_URL).then((response) => {
				if (!response.ok) throw new Error(`RainViewer frame list ${response.status}`);
				return response.json();
			}),
			getLand(),
		]);

		const past = frameList?.radar?.past ?? [];
		// the loop timing is built for exactly imageMax frames
		if (!frameList?.host || past.length < this.imageMax) {
			throw new Error(`RainViewer returned ${past.length} frames, ${this.imageMax} are needed`);
		}
		const frames = past.slice(-this.imageMax);

		const { latitude: lat, longitude: lon } = this.weatherParameters;
		const tiles = tilesForView(lat, lon, ZOOM, size.width, size.height);
		const view = {
			width: size.width,
			height: size.height,
			project: projectToView({ lat, lon }, size.width, size.height, ZOOM),
		};

		const urls = frames.map((frame) => tiles.map((tile) => `${frameList.host}${frame.path}/${TILE_PX}/${ZOOM}/${tile.x}/${tile.y}/2/1_1.png`));
		const bitmaps = await Promise.all(urls.map((frameUrls) => Promise.all(frameUrls.map(loadTile))));

		// keep only the tiles in use
		const used = new Set(urls.flat());
		tileCache = new Map([...tileCache].filter(([url]) => used.has(url)));

		return frames.map((frame, frameIndex) => {
			const canvas = document.createElement('canvas');
			canvas.width = size.width;
			canvas.height = size.height;
			const ctx = canvas.getContext('2d');
			drawLand(ctx, polygons, view);
			tiles.forEach((tile, tileIndex) => {
				const bitmap = bitmaps[frameIndex][tileIndex];
				if (bitmap) ctx.drawImage(bitmap, Math.round(tile.dx), Math.round(tile.dy));
			});
			drawCoast(ctx, polygons, view);
			return {
				canvas,
				timestamp: DateTime.fromSeconds(frame.time, { zone: 'utc' }),
			};
		});
	}

	// the frames are drawn for one view size, rebuild them when the size changes. there are no base map
	// tiles to move, so none of the parent's work applies
	async modeChanged() {
		if (this.status !== STATUS.loaded) return;
		const size = RADAR_FINAL_SIZE();
		const previous = this.view?.radarFinalSize;
		if (previous && previous.width === size.width && previous.height === size.height) return;

		await this.getData(this.weatherParameters, true);
		if (this.active) this.drawCanvas();
	}
}

// the next free nav id, after future radar (13)
registerDisplay(new HawaiiRadar(14, 'hawaii-radar'));
