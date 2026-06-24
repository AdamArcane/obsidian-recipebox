export function debounce(fn: () => void, ms: number, leading = false): () => void {
	let timer: number | null = null;
	let leadingFired = false;

	return () => {
		if (leading && !timer) {
			fn();
			leadingFired = true;
		}
		if (timer) window.clearTimeout(timer);
		timer = window.setTimeout(() => {
			if (!leadingFired) fn();
			timer = null;
			leadingFired = false;
		}, ms);
	};
}
