# Quad View: four towns on one screen

Date: 2026-11-12. Fork: `jnystrom14/ws4kp`, branch `quad-view`, based on upstream 8.2.2.

## Intent

Jen wants one computer monitor to show the WeatherStar 4000+ forecast show for four places she cares about, all at once. If one of those places gets a serious National Weather Service warning, she should notice it from across the room. Because she is often not in the place that has the warning, she must be able to acknowledge it and make the extra activity stop.

## Goals

1. A new page, `quad.html`, that shows a 2 by 2 grid. Each box runs the normal WeatherStar show for one town. Order, left to right, top to bottom:
   1. Bolivia, NC
   2. Durango, CO
   3. Sunriver, OR
   4. Poipu, Kauai, HI
2. Warning display with two levels (details below), plus a small tag for watches and advisories.
3. Acknowledge a warning by clicking its box or pressing that box's number key (1 to 4).
4. Radar for Poipu, using RainViewer. Today the radar and future-radar screens are skipped for HI (see `server/scripts/modules/filmstrip-weather-display.mjs`, "ALASKA AND HAWAII AREN'T SUPPORTED!").
5. Only one soundtrack: box 1 (Bolivia) may play music; boxes 2 to 4 are always muted.
6. Hosted on GitHub Pages from the fork, opened from a bookmark on Jen's Mac. Kiosk mode on, so the grid fills the monitor with no menus.

## Non-goals

- No other APIs from Jen's `public-apis` list (Open-Meteo, Storm Glass, etc.). She chose to skip them for now.
- No change to how a single town's show looks or plays.
- No sound alerts.
- No change to mainland radar. RainViewer is for HI only.
- No settings screen for picking towns in this version. The four towns can live in one config object in code.

## Anti-goals (would count as failure even if it works)

- Alerts that are on most of the time, so she learns to ignore them. Watches and advisories must not trigger the red border.
- An acknowledged warning that keeps flashing or keeps taking over the screen.
- Four soundtracks playing over each other.
- Changes spread through upstream files in a way that makes pulling future upstream releases painful. Keep new code in new files where possible; keep edits to existing upstream files small.
- Settings in one box leaking into another box (see Risks).

## Warning behavior

Alert data comes from `https://api.weather.gov/alerts/active?point=<lat>,<lon>&status=actual`, the same source `hazards.mjs` uses.

| Alert | What the box does |
|---|---|
| Watch or advisory (severity Moderate or Minor, or event name containing "Watch" or "Advisory" or "Statement") | Small yellow tag in the box with the event name. No border. |
| Level 1: any Warning (event name ends in "Warning") not in Level 2 | Thick red border that pulses slowly. Red bar across the top of the box with the warning name in caps, e.g. "WINTER STORM WARNING". Other boxes do not change. |
| Level 2: Tornado Warning, Hurricane Warning, Flash Flood Warning, or any alert with severity "Extreme" | Everything in Level 1, plus: the box grows to fill the whole monitor for about 30 seconds, then shrinks back. Repeats about every 5 minutes until the warning ends or is acknowledged. |

**Classification order (resolves overlap between rows):** check Level 2 first, then the "frequent warnings" list, then Level 1, then tag. The event name decides, not the severity field, except for "Extreme" (always Level 2). A Winter Storm Warning with severity Moderate is Level 1.

**Frequent warnings are tag-only (Jen's decision, 2026-11-12):** High Surf Warning, Red Flag Warning, and heat warnings (Excessive Heat Warning, Heat Warning, Extreme Heat Warning) show only the yellow tag, never the red border. They come up often in these towns (Poipu winter surf, Durango and Sunriver fire season), and a border that is lit for weeks gets ignored. Keep this list in one place in the code so it is easy to change.

If a town has several alerts, it shows the highest level. The Level 1 / Level 2 cutoff is Claude's call, based on the NWS severity field the fork already sorts by. Exact timings (30 s, 5 min, pulse speed) are the builder's to tune.

### Acknowledge

- Clicking an alerting box, or pressing its number key, acknowledges all alerts currently active for that town.
- After acknowledging: no pulsing, no full-screen takeover. A thin steady red edge and a small "ACKNOWLEDGED" tag remain while the warning is active.
- Acknowledgment is per alert (by NWS alert `id`). A new alert for that town, or an alert at a higher level than what was acknowledged, restarts the full behavior.
- **Reissues stay acknowledged (Claude's call).** NWS often reissues an active alert as an "Update" with a new `id` whose `references` field points to the earlier one. If any referenced alert was acknowledged, the update inherits the acknowledgment, unless its level is higher. Without this, Jen would re-acknowledge the same storm every few hours.
- Acknowledgments are saved in `localStorage` so a page reload does not bring alerts back. Expired alert ids can be dropped.
- Clicking or pressing a key on a box with no alert does nothing.

## Constraints and facts from the code

- Each box can be loaded with a permalink: `?latLonQuery=...&latLon={"lat":..,"lon":..}&kiosk=true&mediaVolume=...` (see README "Sharing a permalink"). Settings left out of the URL fall back to the saved setting.
- Settings are saved in `localStorage` (`server/scripts/modules/utils/setting.mjs`). All four boxes share one origin, so they share one `localStorage`.
- `npm run build` (gulp `buildDist`) produces a static `dist/` that the README says can be hosted on any web server, with the browser calling NWS directly.
- No `X-Frame-Options` or `frame-ancestors` header was found in the repo, so the boxes can be same-origin iframes.
- RainViewer: free, no key, global radar tiles (listed in Jen's `public-apis` fork).

## Risks the builder must handle

1. **Shared `localStorage`.** Four same-origin boxes that each write their location and settings to one store may overwrite each other, especially on reload or on the app's own refresh. The builder must make sure each box always uses its own URL values. One approach: a URL flag (e.g. `quad=1` or `noSave=1`) that stops the box from writing settings. The builder chooses the method.
2. **Autoplay.** Browsers block music until the user interacts. Box 1 may stay silent until Jen clicks once. This is acceptable.
3. **GitHub Pages path.** The site will be served from `/ws4kp/`, not `/`. Asset paths in the build must work under that sub-path.
4. **Scale.** Each box must scale the 4:3 show to fit a quarter of the monitor, and fill the whole monitor during a Level 2 takeover.

## Poipu radar scope (Claude's call)

- Regular radar screen only. Future radar stays skipped for HI. Reason: the builder check reports RainViewer discontinued its nowcast (forecast) radar on 2026-01-01 and limits zoom on the free tier (not yet verified by Claude; confirm during build).
- Full screen: a maximized browser window plus the app's kiosk mode is enough. Jen can press Cmd-Ctrl-F for true full screen. No first-click full-screen step.

## Later, not in this build: retro maps

Jen is interested but chose to wait (2026-11-12). Build the quad view first; she will decide on maps after using it. If picked up later:

- Retro-style maps drawn from real coastline and road data in the WeatherStar palette: a Kauai map for Poipu's radar, and a close-up Bolivia / Brunswick County screen with a "HOME" star on her house.
- **Privacy rule (Jen's decision, firm):** her house location must never be in the repo, the build, or the public GitHub Pages site. It is entered once on her Mac and stored only in her browser. The public page shows no home marker. Her address must not be sent to any outside geocoding service; she copies coordinates from Google Maps herself.

Until then, Poipu's radar uses a plain map background.

## Left to the builder

- Whether `quad.html` is a wrapper of iframes (Claude's suggestion, since it reuses the existing app with almost no changes) or something else.
- Whether the wrapper polls NWS alerts itself (suggested: every 2 to 5 minutes per town) or reads them from each box.
- How the RainViewer radar screen is built: a new display module that only runs for HI and AK, or a branch inside the existing radar module.
- The GitHub Pages deploy method (GitHub Actions workflow is likely simplest).
- Test approach. The classification logic (which level an alert is, what acknowledgment suppresses) is logic-heavy and should have tests before code review.

## Decisions log

- Jen's: four boxes, the four towns, warnings that stand out, acknowledge to suppress, skip extra APIs, Poipu radar, GitHub Pages is fine (public address OK), runs on her Mac, only while the page is open.
- Claude's calls (Jen agreed to the warning plan): the two levels and the Level 2 list, yellow tags for watches and advisories, no sounds, box order, music from box 1 only, RainViewer for HI only, click or number key to acknowledge, acknowledgments saved across reloads.
