// Pure takeover scheduling. No DOM.
const TAKEOVER_MS = 30000;
const CYCLE_MS = 300000;
const POLL_MS = 180000;

// Returns the box index that should fill the screen now, or null.
const pickTakeover = (nowMs, cycleStartMs, level2Boxes) => {
	if (!level2Boxes.length) return null;
	const elapsed = (nowMs - cycleStartMs) % CYCLE_MS;
	const slot = Math.floor(elapsed / TAKEOVER_MS);
	return slot < level2Boxes.length ? level2Boxes[slot] : null;
};

// The cycle restarts when a box joins the list, so a new extreme warning takes over at once.
const shouldRestartCycle = (previousBoxes, nextBoxes) => nextBoxes.some((index) => !previousBoxes.includes(index));

export {
	TAKEOVER_MS, CYCLE_MS, POLL_MS, pickTakeover, shouldRestartCycle,
};
