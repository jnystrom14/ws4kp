// Classic script: must run before any app script. On quad pages, give each box a private in-memory localStorage
// so the four same-origin iframes do not share settings or location.
(() => {
	if (!new URLSearchParams(window.location.search).has('quad')) return;
	const data = new Map();
	const memoryStore = {
		getItem: (key) => (data.has(String(key)) ? data.get(String(key)) : null),
		setItem: (key, value) => {
			data.set(String(key), String(value));
		},
		removeItem: (key) => {
			data.delete(String(key));
		},
		clear: () => {
			data.clear();
		},
		key: (index) => ([...data.keys()][index] ?? null),
		get length() {
			return data.size;
		},
	};
	Object.defineProperty(window, 'localStorage', { value: memoryStore, configurable: true });
})();
