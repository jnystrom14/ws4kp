// base map for the RainViewer radar: water across the whole frame, then the land, in the colors of the
// mainland radar base map (server/images/maps/radar-conus/base)
//
// land data: server/data/hawaii-land.json
// source: Natural Earth 1:10m physical "land" (ne_10m_land), version on the nvkelso/natural-earth-vector
//   GitHub mirror, geojson/ne_10m_land.geojson, downloaded 2026-11-12
// license: public domain, see https://www.naturalearthdata.com/about/terms-of-use/
// processing: kept the polygons that lie inside lon -161 to -154, lat 18 to 23 (the main Hawaiian islands),
//   simplified with Douglas-Peucker at 0.002 degrees (under one pixel at zoom 7) and rounded to 3 decimals
// format: GeoJSON MultiPolygon, coordinates are [polygon][ring][point] = [lon, lat]

export const WATER_COLOR = 'rgb(75, 105, 170)';
export const LAND_COLOR = 'rgb(124, 132, 138)';
export const COAST_COLOR = 'rgb(0, 0, 0)';

// one path holding every ring of every polygon, holes are handled by the even-odd fill rule
const landPath = (ctx, polygons, project) => {
	ctx.beginPath();
	polygons.forEach((rings) => {
		rings.forEach((ring) => {
			ring.forEach(([lon, lat], index) => {
				const [x, y] = project(lon, lat);
				if (index === 0) {
					ctx.moveTo(x, y);
				} else {
					ctx.lineTo(x, y);
				}
			});
			ctx.closePath();
		});
	});
};

// draw only the coastline, used on top of the radar so the islands stay readable under heavy rain
export const drawCoast = (ctx, polygons, view) => {
	landPath(ctx, polygons, view.project);
	ctx.strokeStyle = COAST_COLOR;
	ctx.lineWidth = 1;
	ctx.stroke();
};

// view: { width, height, project(lon, lat) -> [x, y] canvas pixels }
export const drawLand = (ctx, polygons, view) => {
	ctx.fillStyle = WATER_COLOR;
	ctx.fillRect(0, 0, view.width, view.height);

	landPath(ctx, polygons, view.project);
	ctx.fillStyle = LAND_COLOR;
	ctx.fill('evenodd');
	drawCoast(ctx, polygons, view);
};
