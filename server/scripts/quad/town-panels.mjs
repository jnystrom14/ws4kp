// Town view: all four boxes show one town, each box limited to its own screens.
import { boxUrl } from './box-url.mjs';

// Hawaii and Alaska use the Hawaii radar; the mainland uses the regular one.
// Only one may be on: the show waits on the first enabled screen, and the mainland
// radar never loads for Hawaii, so with both on the panel would stay on the title screen.
const isHawaiiOrAlaska = (town) => /, (HI|AK)$/.test(town.query);
const radarScreens = (town) => (isHawaiiOrAlaska(town) ? ['hawaii-radar'] : ['radar']);

// The show's nearby-towns list for Hawaii is mostly Oahu, so Hawaii gets the
// Regional Observations map of the island chain instead.
const aroundScreens = (town) => (isHawaiiOrAlaska(town)
	? ['regional-forecast', 'extended-forecast']
	: ['latest-observations', 'extended-forecast']);

const PANELS = [
	{ label: 'Radar', screens: radarScreens },
	{ label: 'Right Now', screens: ['hazards', 'current-weather', 'almanac'] },
	{ label: 'Forecast', screens: ['local-forecast'] },
	{ label: 'Around Town', screens: aroundScreens, coast: true },
];

const panelUrls = (town) => PANELS.map(({ screens }) => boxUrl(town, {
	music: false,
	screens: typeof screens === 'function' ? screens(town) : screens,
}));

export { PANELS, panelUrls };
