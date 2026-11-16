/**
 * Decides when a sync may start: one run at a time, no runs while offline, and
 * a 30 second floor between runs. Also owns the "did our own write cause this
 * modify event" check so the debounced push does not echo our own note write.
 */
const MIN_GAP_MS = 30_000;

export class SyncScheduler {
	private running = false;
	private lastRunAt = 0;
	private lastWritten: string | null = null;

	constructor(private run: () => Promise<void>, private isOnline: () => boolean = () => navigator.onLine) {}

	/**
	 * manual: skips every check except the lock. edit: the debounced push after
	 * a note change, skips only the gap (the user just acted, so waiting would
	 * feel broken). interval: all checks.
	 */
	async trigger(mode: "manual" | "edit" | "interval"): Promise<boolean> {
		if (this.running) return false;
		if (mode !== "manual") {
			if (!this.isOnline()) return false;
			if (mode === "interval" && Date.now() - this.lastRunAt < MIN_GAP_MS) return false;
		}
		this.running = true;
		try {
			await this.run();
		} finally {
			this.running = false;
			this.lastRunAt = Date.now();
		}
		return true;
	}

	isRunning(): boolean {
		return this.running;
	}

	/** Called with the text we just wrote to the note. */
	noteOwnWrite(text: string): void {
		this.lastWritten = text;
	}

	/** True when the note content is exactly what our own last write produced. */
	isOwnWrite(currentText: string): boolean {
		return this.lastWritten !== null && this.lastWritten === currentText;
	}
}
