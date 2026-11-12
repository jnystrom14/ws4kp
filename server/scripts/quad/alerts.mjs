// Fetches active NWS alerts for a town. Resolves null on any failure so callers keep their last state.
const fetchTownAlerts = async (town, fetchFn = fetch) => {
	try {
		const url = `https://api.weather.gov/alerts/active?point=${town.lat},${town.lon}&status=actual`;
		const response = await fetchFn(url, { headers: { Accept: 'application/geo+json' } });
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

export { fetchTownAlerts, canPruneAcks };
export default fetchTownAlerts;
