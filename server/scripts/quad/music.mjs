// Background music for the whole grid, played by this page (not by a box).
// Browsers only allow sound after a click or key press on the page itself, so the
// first gesture anywhere starts the music. "M" pauses and resumes it afterwards.

const VOLUME = 0.75;

const shuffle = (list) => {
	const copy = [...list];
	for (let i = copy.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy;
};

const loadPlaylist = async () => {
	try {
		const response = await fetch('playlist.json');
		if (!response.ok) return [];
		const data = await response.json();
		return Array.isArray(data?.availableFiles) ? data.availableFiles : [];
	} catch {
		return [];
	}
};

const setupMusic = async (wrapper, hint) => {
	const files = shuffle(await loadPlaylist());
	if (files.length === 0) {
		hint?.remove();
		return;
	}

	let track = 0;
	let started = false;
	const player = new Audio();
	player.volume = VOLUME;
	player.src = `music/${files[track]}`;
	player.addEventListener('ended', () => {
		track = (track + 1) % files.length;
		player.src = `music/${files[track]}`;
		player.play().catch(() => {});
	});

	const tryStart = async () => {
		if (started) return;
		try {
			await player.play();
			started = true;
			hint?.classList.add('hidden');
		} catch {
			// still blocked; the next click or key press tries again
		}
	};

	wrapper.addEventListener('pointerdown', tryStart);
	wrapper.addEventListener('keydown', (e) => {
		if (started && (e.key === 'm' || e.key === 'M')) {
			if (player.paused) player.play().catch(() => {});
			else player.pause();
			return;
		}
		tryStart();
	});

	// some browsers allow sound without a gesture on sites visited often
	tryStart();
};

export default setupMusic;
