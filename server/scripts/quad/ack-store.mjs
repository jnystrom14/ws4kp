// Acknowledgment bookkeeping. acks shape: { [alertId]: { level, lastSeen } }, lastSeen in ms.
// No DOM, no clock: storage and the current time are passed in.
import { classifyAlert, isAcknowledged, ackLevel } from './alert-levels.mjs';

const STORAGE_KEY = 'quadAcks';

// api.weather.gov responses vary between servers, so one poll can omit an active alert.
// An ack is dropped only after its alert has been missing from every response for this long.
const ACK_UNSEEN_MS = 24 * 60 * 60 * 1000;

const acknowledgeAll = (features, acks = {}, now = Date.now()) => {
	const next = { ...acks };
	features.forEach(({ properties }) => {
		const level = classifyAlert(properties);
		if (level > 0) next[properties.id] = { level: Math.max(ackLevel(next[properties.id]) || 0, level), lastSeen: now };
	});
	return next;
};

// Alerts in this response refresh their ack (updates inherit the acknowledgment of the alerts they
// reference, never an escalation). Acks whose alert is missing are kept until unseen for ACK_UNSEEN_MS.
const reconcile = (features, acks = {}, now = Date.now()) => {
	const next = {};
	features.forEach(({ properties }) => {
		if (isAcknowledged(properties, acks)) {
			next[properties.id] = {
				level: Math.max(ackLevel(acks[properties.id]) || 0, classifyAlert(properties)),
				lastSeen: now,
			};
		}
	});
	Object.entries(acks).forEach(([id, entry]) => {
		if (!(id in next) && now - entry.lastSeen < ACK_UNSEEN_MS) next[id] = entry;
	});
	return next;
};

// Plain numbers are acks saved by an older version: treat them as seen now.
const normalize = (entry, now) => {
	if (typeof entry === 'number') return { level: entry, lastSeen: now };
	if (entry && typeof entry.level === 'number' && typeof entry.lastSeen === 'number') return entry;
	return null;
};

const loadAcks = (storage, now = Date.now()) => {
	try {
		const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		const acks = {};
		Object.entries(parsed).forEach(([id, entry]) => {
			const ack = normalize(entry, now);
			if (ack) acks[id] = ack;
		});
		return acks;
	} catch {
		return {};
	}
};

const saveAcks = (storage, acks) => {
	storage.setItem(STORAGE_KEY, JSON.stringify(acks));
};

export {
	isAcknowledged, acknowledgeAll, reconcile, loadAcks, saveAcks, ACK_UNSEEN_MS,
};
