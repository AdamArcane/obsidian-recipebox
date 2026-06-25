/**
 * Enables free-floating drag behaviour for timer widgets, letting them detach
 * from the tray and be repositioned anywhere on screen.
 */
import { getTray, removeTray } from "./timer-tray";

export function makeDraggable(widget: HTMLElement, handle: HTMLElement): () => void {
	let detached = false;
	let startX = 0, startY = 0, originLeft = 0, originTop = 0;

	function detachFromTray(): void {
		const rect = widget.getBoundingClientRect();
		widget.setCssProps({ position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, right: "auto", bottom: "auto" });
		activeDocument.body.appendChild(widget);
		const tray = getTray();
		if (!tray.hasChildNodes()) removeTray();
		detached = true;
		// Update origins so the move calculation stays correct after repositioning
		originLeft = rect.left;
		originTop = rect.top;
	}

	function onPointerDown(e: PointerEvent): void {
		if ((e.target as HTMLElement).closest("a, button, [role='button']")) return;
		e.preventDefault();
		handle.setPointerCapture(e.pointerId);
		startX = e.clientX;
		startY = e.clientY;
		originLeft = parseInt(widget.style.left || "0", 10);
		originTop = parseInt(widget.style.top || "0", 10);
		handle.addEventListener("pointermove", onPointerMove);
		handle.addEventListener("pointerup", onPointerUp);
		handle.addEventListener("pointercancel", onPointerUp);
	}

	function onPointerMove(e: PointerEvent): void {
		if (!detached) detachFromTray();
		widget.setCssProps({ left: `${originLeft + e.clientX - startX}px`, top: `${originTop + e.clientY - startY}px` });
	}

	function onPointerUp(): void {
		handle.removeEventListener("pointermove", onPointerMove);
		handle.removeEventListener("pointerup", onPointerUp);
		handle.removeEventListener("pointercancel", onPointerUp);
	}

	handle.addEventListener("pointerdown", onPointerDown);
	return () => {
		handle.removeEventListener("pointerdown", onPointerDown);
		onPointerUp();
	};
}
