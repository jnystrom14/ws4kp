// Town view: all four boxes show one town, each box limited to its own screens.
import { boxUrl } from './box-url.mjs';

// Hawaii and Alaska use the Hawaii radar; the mainland uses the regular one.
// Only one may be on: the show waits on the first enabled screen, and the mainland
// radar never loads for Hawaii, so with both on the panel would stay on the title screen.
const radarScreens = (town) => (/, (HI|AK)$/.test(town.query) ? ['hawaii-radar'] : ['radar']);

const PANELS = [
	{ label: 'Radar', screens: radarScreens },
	{ label: 'Right Now', screens: ['hazards', 'current-weather', 'almanac'] },
	{ label: 'Forecast', screens: ['local-forecast'] },
	{ label: 'Around Town', screens: ['latest-observations', 'extended-forecast'], coast: true },
];

const panelUrls = (town) => PANELS.map(({ screens }) => boxUrl(town, {
	music: false,
	screens: typeof screens === 'function' ? screens(town) : screens,
}));

export { PANELS, panelUrls };
