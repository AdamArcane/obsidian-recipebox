/**
 * Attaches a cross-platform long-press handler to a DOM element — uses touch
 * events on mobile and contextmenu on desktop — returning a cleanup function.
 */
export interface LongPressPosition {
	x: number;
	y: number;
}

const HOLD_MS = 500;
const DRIFT_PX = 8;

export function attachLongPress(
	el: HTMLElement,
	onMenu: (pos: LongPressPosition) => void
): () => void {
	let timer: number | null = null;
	let startX = 0;
	let startY = 0;

	function cancel() {
		if (timer !== null) {
			window.clearTimeout(timer);
			timer = null;
		}
	}

	function onTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		startX = e.touches[0].clientX;
		startY = e.touches[0].clientY;
		timer = window.setTimeout(() => {
			timer = null;
			onMenu({ x: startX, y: startY });
		}, HOLD_MS);
	}

	function onTouchMove(e: TouchEvent) {
		if (timer === null) return;
		const dx = e.touches[0].clientX - startX;
		const dy = e.touches[0].clientY - startY;
		if (Math.sqrt(dx * dx + dy * dy) > DRIFT_PX) cancel();
	}

	function onContextMenu(e: MouseEvent) {
		e.preventDefault();
		onMenu({ x: e.clientX, y: e.clientY });
	}

	el.addEventListener("touchstart", onTouchStart, { passive: true });
	el.addEventListener("touchmove", onTouchMove, { passive: true });
	el.addEventListener("touchend", cancel);
	el.addEventListener("touchcancel", cancel);
	el.addEventListener("contextmenu", onContextMenu);

	return () => {
		cancel();
		el.removeEventListener("touchstart", onTouchStart);
		el.removeEventListener("touchmove", onTouchMove);
		el.removeEventListener("touchend", cancel);
		el.removeEventListener("touchcancel", cancel);
		el.removeEventListener("contextmenu", onContextMenu);
	};
}
