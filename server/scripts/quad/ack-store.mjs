// Acknowledgment bookkeeping. acks shape: { [alertId]: level }. No DOM: storage is passed in.
import { classifyAlert, isAcknowledged } from './alert-levels.mjs';

const STORAGE_KEY = 'quadAcks';

const acknowledgeAll = (features, acks = {}) => {
	const next = { ...acks };
	features.forEach(({ properties }) => {
		const level = classifyAlert(properties);
		if (level > 0) next[properties.id] = Math.max(next[properties.id] || 0, level);
	});
	return next;
};

// Updates inherit the acknowledgment of the alerts they reference (never an escalation),
// then acks for alerts that are no longer active are dropped.
const reconcile = (features, acks = {}) => {
	const next = {};
	features.forEach(({ properties }) => {
		if (isAcknowledged(properties, acks)) {
			next[properties.id] = Math.max(acks[properties.id] || 0, classifyAlert(properties));
		}
	});
	return next;
};

const loadAcks = (storage) => {
	try {
		const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
	} catch {
		return {};
	}
};

const saveAcks = (storage, acks) => {
	storage.setItem(STORAGE_KEY, JSON.stringify(acks));
};

export {
	isAcknowledged, acknowledgeAll, reconcile, loadAcks, saveAcks,
};
