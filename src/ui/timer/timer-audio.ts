/** Plays a short completion chime using the Web Audio API when a cooking timer reaches zero. */
export function playCompletionSound(): void {
	try {
		const ctx = new AudioContext();
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sine";
		osc.frequency.value = 880;
		gain.gain.setValueAtTime(0.4, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(ctx.currentTime);
		osc.stop(ctx.currentTime + 1.0);

		osc.onended = () => { void ctx.close(); };
	} catch {
		// Audio unavailable — visual finish state still communicates completion
	}
}
