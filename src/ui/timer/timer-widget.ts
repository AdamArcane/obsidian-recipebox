/**
 * The countdown timer widget — renders the timer UI, manages the countdown
 * interval, triggers audio on completion, and supports drag via timer-drag.ts.
 */
import { Notice, setIcon } from "obsidian";
import { formatTime, parseTimeInput } from "./time-format";
import { playCompletionSound } from "./timer-audio";
import { getTray, registerTimer, unregisterTimer } from "./timer-tray";
import { makeDraggable } from "./timer-drag";

export interface TimerOptions {
	autoStart: boolean;
	compactByDefault: boolean;
	rangeDefault: "min" | "max";
	recipeName: string;
	onNavigate: () => void;
}

// Stepper increment is fixed at one minute — not worth exposing as a setting.
const STEP_INCREMENT_SECONDS = 60;

export class TimerWidget {
	private el: HTMLElement;
	private displayEl!: HTMLElement;
	private playBtn!: HTMLElement;
	private remaining: number;
	private total: number;
	private intervalId: number | null = null;
	private cleanups: Array<() => void> = [];
	private compact: boolean;

	constructor(
		private readonly anchor: HTMLElement,
		private readonly durationSeconds: number,
		private readonly label: string,
		private readonly opts: TimerOptions,
	) {
		this.remaining = durationSeconds;
		this.total = durationSeconds;
		this.compact = opts.compactByDefault;

		this.el = getTray().createDiv({ cls: "rb-timer-widget" });
		registerTimer(this);
		anchor.addClass("rb-duration-btn--active");

		this.build();
		if (opts.autoStart) this.start();
		if (this.compact) this.el.addClass("is-compact");
	}

	private build(): void {
		const handle = this.el.createDiv({ cls: "rb-timer-handle" });

		const nameLink = handle.createEl("a", { cls: "rb-timer-recipe-link", text: this.opts.recipeName });
		nameLink.addEventListener("click", () => this.opts.onNavigate());

		handle.createDiv({ cls: "rb-timer-label", text: this.label });

		const timeRow = handle.createDiv({ cls: "rb-timer-time-row" });
		this.displayEl = timeRow.createDiv({ cls: "rb-timer-display", text: formatTime(this.remaining) });
		this.displayEl.addEventListener("click", () => this.startEdit());

		const steppers = timeRow.createDiv({ cls: "rb-timer-steppers" });
		this.makeStepBtn(steppers, "chevron-up", +STEP_INCREMENT_SECONDS);
		this.makeStepBtn(steppers, "chevron-down", -STEP_INCREMENT_SECONDS);

		const controls = this.el.createDiv({ cls: "rb-timer-controls" });
		this.playBtn = this.makeIconBtn(controls, "play", "Start", () => this.togglePlay(), "rb-timer-btn rb-timer-btn--play");

		this.makeIconBtn(controls, "rotate-ccw", "Reset", () => this.reset());

		const compactBtn = this.makeIconBtn(controls, this.compact ? "expand" : "minimize-2", "Toggle compact", () => {
			this.compact = !this.compact;
			this.el.toggleClass("is-compact", this.compact);
			setIcon(compactBtn.children[0] as HTMLElement, this.compact ? "expand" : "minimize-2");
			compactBtn.setAttribute("aria-label", this.compact ? "Expand" : "Compact");
		});

		this.makeIconBtn(controls, "x", "Close", () => this.close());

		const detachDrag = makeDraggable(this.el, handle);
		this.cleanups.push(detachDrag);
	}

	private makeIconBtn(container: HTMLElement, icon: string, label: string, onClick: () => void, cls = "rb-timer-btn"): HTMLElement {
		const btn = container.createDiv({ cls, attr: { "aria-label": label, role: "button", tabindex: "0" } });
		const iconEl = btn.createSpan();
		setIcon(iconEl, icon);
		btn.addEventListener("click", onClick);
		return btn;
	}

	private makeStepBtn(container: HTMLElement, icon: string, delta: number): void {
		const btn = container.createDiv({ cls: "rb-timer-step-btn", attr: { role: "button" } });
		const iconEl = btn.createSpan();
		setIcon(iconEl, icon);
		btn.addEventListener("click", () => this.adjustTime(delta));
	}

	private adjustTime(delta: number): void {
		this.remaining = Math.max(0, this.remaining + delta);
		this.total = Math.max(0, this.total + delta);
		this.el.removeClass("is-finished");
		this.updateDisplay();
	}

	private startEdit(): void {
		const wasRunning = this.intervalId !== null;
		if (wasRunning) this.pause();

		const input = createEl("input", { cls: "rb-timer-input", type: "text", value: formatTime(this.remaining) });
		this.displayEl.replaceWith(input);
		input.focus();
		input.select();

		const commit = () => {
			const parsed = parseTimeInput(input.value);
			if (parsed !== null) { this.remaining = parsed; }
			input.replaceWith(this.displayEl);
			this.updateDisplay();
			if (wasRunning && this.remaining > 0) this.start();
		};

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") commit();
			if (e.key === "Escape") { input.replaceWith(this.displayEl); if (wasRunning) this.start(); }
		});
		input.addEventListener("blur", commit);
	}

	private togglePlay(): void {
		if (this.intervalId !== null) { this.pause(); } else { this.start(); }
	}

	start(): void {
		if (this.intervalId !== null || this.remaining <= 0) return;
		this.intervalId = window.setInterval(() => {
			this.remaining = Math.max(0, this.remaining - 1);
			this.updateDisplay();
			if (this.remaining <= 0) this.finish();
		}, 1000);
		setIcon(this.playBtn.children[0] as HTMLElement, "pause");
		this.playBtn.setAttribute("aria-label", "Pause");
	}

	pause(): void {
		if (this.intervalId === null) return;
		window.clearInterval(this.intervalId);
		this.intervalId = null;
		setIcon(this.playBtn.children[0] as HTMLElement, "play");
		this.playBtn.setAttribute("aria-label", "Start");
	}

	private reset(): void {
		this.pause();
		this.remaining = this.total;
		this.el.removeClass("is-finished");
		this.updateDisplay();
	}

	private finish(): void {
		this.pause();
		this.remaining = 0;
		this.updateDisplay();
		this.el.addClass("is-finished");
		playCompletionSound();
		new Notice(`Timer done: ${this.label}`);
	}

	private updateDisplay(): void {
		this.displayEl.textContent = formatTime(this.remaining);
	}

	close(): void {
		this.pause();
		for (const fn of this.cleanups) fn();
		this.anchor.removeClass("rb-duration-btn--active");
		this.el.remove();
		unregisterTimer(this);
	}

	destroy(): void {
		this.pause();
		for (const fn of this.cleanups) fn();
		this.el.remove();
	}
}
