export interface DestroyableTimer {
	destroy(): void;
}

let tray: HTMLElement | null = null;
const trackedWidgets = new Set<DestroyableTimer>();

export function getTray(): HTMLElement {
	if (tray && tray.isConnected) return tray;
	tray = activeDocument.body.createDiv({ cls: "rb-timer-tray" });
	return tray;
}

export function registerTimer(w: DestroyableTimer): void {
	trackedWidgets.add(w);
}

export function unregisterTimer(w: DestroyableTimer): void {
	trackedWidgets.delete(w);
	if (trackedWidgets.size === 0) removeTray();
}

export function removeTray(): void {
	tray?.remove();
	tray = null;
}

export function clearAllTimers(): void {
	for (const w of [...trackedWidgets]) w.destroy();
	trackedWidgets.clear();
	removeTray();
}
