// Pure alert classification. No DOM, no fetch: safe to import in the browser and in node.

const LEVEL = {
	NONE: 0, TAG: 1, WARNING: 2, EXTREME: 3,
};

const LEVEL2_EVENTS = ['Tornado Warning', 'Hurricane Warning', 'Flash Flood Warning'];

const TAG_ONLY_EVENTS = [
	'High Surf Warning',
	'Red Flag Warning',
	'Excessive Heat Warning',
	'Heat Warning',
	'Extreme Heat Warning',
];

const classifyAlert = (properties) => {
	const { event = '', severity, messageType } = properties;
	if (messageType === 'Cancel') return LEVEL.NONE;
	if (severity === 'Extreme' || LEVEL2_EVENTS.includes(event)) return LEVEL.EXTREME;
	if (TAG_ONLY_EVENTS.includes(event)) return LEVEL.TAG;
	if (event.endsWith('Warning')) return LEVEL.WARNING;
	return LEVEL.TAG;
};

// An alert is acknowledged when its own id, or any alert it updates, was acknowledged at this level or higher.
const isAcknowledged = (properties, acks = {}) => {
	const level = classifyAlert(properties);
	if (acks[properties.id] >= level) return true;
	return (properties.references || []).some((ref) => acks[ref.identifier] >= level);
};

// Highest alert wins; first one wins a tie.
const highest = (items) => items.reduce((best, item) => (!best || item.level > best.level ? item : best), null);

const townStatus = (features, acks = {}) => {
	const alerts = features
		.map(({ properties }) => ({
			level: classifyAlert(properties),
			event: properties.event,
			acknowledged: isAcknowledged(properties, acks),
		}))
		.filter((alert) => alert.level > LEVEL.NONE);

	const tags = [...new Set(alerts.filter((alert) => alert.level === LEVEL.TAG).map((alert) => alert.event))];
	const warnings = alerts.filter((alert) => alert.level >= LEVEL.WARNING);

	const unacknowledged = highest(warnings.filter((alert) => !alert.acknowledged));
	if (unacknowledged) {
		return {
			level: unacknowledged.level, acknowledged: false, label: unacknowledged.event.toUpperCase(), tags,
		};
	}
	const acknowledged = highest(warnings);
	if (acknowledged) {
		return {
			level: acknowledged.level, acknowledged: true, label: acknowledged.event.toUpperCase(), tags,
		};
	}
	return {
		level: tags.length ? LEVEL.TAG : LEVEL.NONE, acknowledged: false, label: '', tags,
	};
};

export {
	LEVEL, LEVEL2_EVENTS, TAG_ONLY_EVENTS, classifyAlert, isAcknowledged, townStatus,
};
