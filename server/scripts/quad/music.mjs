// Background music for the whole grid, played by this page (not by a box).
// Browsers only allow sound after a click or key press on the page itself, so the
// first gesture anywhere starts the music. "M" pauses and resumes it afterwards,
// "N" skips to the next song. Each song's name shows in the corner for a few seconds.

const VOLUME = 0.75;
const NAME_MS = 6000;

// "default/Moonlit sky.mp3" -> "Moonlit sky"
const songName = (file) => file.split('/').pop().replace(/\.mp3$/i, '');

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

	let hideTimer;
	const showName = () => {
		if (!hint) return;
		hint.textContent = `\u266B ${songName(files[track])}`;
		hint.classList.remove('hidden');
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => hint.classList.add('hidden'), NAME_MS);
	};
	player.addEventListener('playing', showName);

	const nextSong = () => {
		track = (track + 1) % files.length;
		player.src = `music/${files[track]}`;
		player.play().catch(() => {});
	};
	player.addEventListener('ended', nextSong);

	const tryStart = async () => {
		if (started) return;
		try {
			await player.play();
			started = true;
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
		if (started && (e.key === 'n' || e.key === 'N')) {
			nextSong();
			return;
		}
		tryStart();
	});

	// some browsers allow sound without a gesture on sites visited often
	tryStart();
};

export default setupMusic;
