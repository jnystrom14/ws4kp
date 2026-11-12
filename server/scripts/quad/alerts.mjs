// a hung request becomes a failure instead of blocking every later poll
const FETCH_TIMEOUT_MS = 20000;

// Fetches active NWS alerts for a town. Resolves null on any failure (including a timeout) so callers keep their last state.
const fetchTownAlerts = async (town, fetchFn = fetch) => {
	try {
		const url = `https://api.weather.gov/alerts/active?point=${town.lat},${town.lon}&status=actual`;
		const response = await fetchFn(url, {
			headers: { Accept: 'application/geo+json' },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		});
		if (!response.ok) return null;
		const data = await response.json();
		return Array.isArray(data?.features) ? data.features : null;
	} catch {
		return null;
	}
};

// Stored acknowledgments may only be pruned once every town has had a successful fetch since page load.
// Otherwise a failed first fetch would wipe that town's acknowledgments.
const canPruneAcks = (loadedFlags) => loadedFlags.length > 0 && loadedFlags.every(Boolean);

export { fetchTownAlerts, canPruneAcks, FETCH_TIMEOUT_MS };
export default fetchTownAlerts;
