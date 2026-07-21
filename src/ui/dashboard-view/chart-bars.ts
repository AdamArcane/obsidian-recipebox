/**
 * Generic, reusable SVG bar chart with a y-axis (max/zero gridlines + labels)
 * and x-axis tick labels. Bar height is the one runtime-computed value here,
 * so it's driven by a CSS custom property (scaleY transform) rather than an
 * inline style assignment, matching the plugin's no-inline-style rule.
 *
 * Axis tick text is plain HTML, not SVG text -- the bars use a non-uniform
 * (`preserveAspectRatio: none`) scale so they can stretch freely, but that
 * same stretch would distort SVG text into something unreadable. Keeping
 * text outside the scaled SVG sidesteps that entirely.
 */
export interface BarChartBar {
	axisLabel: string;
	hoverLabel: string;
	value: number;
	onClick?: (evt: MouseEvent) => void;
}

export interface BarChartOptions {
	// Render the x-axis label on every Nth bar only (1 = every bar). Used to
	// avoid label collision on dense (e.g. 28-bar) charts.
	labelEvery?: number;
}

export function renderBarChart(container: HTMLElement, bars: BarChartBar[], options: BarChartOptions = {}): void {
	const labelEvery = options.labelEvery ?? 1;
	const max = Math.max(1, ...bars.map((d) => d.value));

	const wrap = container.createDiv({ cls: "rb-dashboard-chart-wrap" });
	const plot = wrap.createDiv({ cls: "rb-dashboard-chart-plot" });

	const yAxis = plot.createDiv({ cls: "rb-dashboard-chart-yaxis" });
	yAxis.createSpan({ cls: "rb-dashboard-chart-yaxis-tick", text: String(max) });
	yAxis.createSpan({ cls: "rb-dashboard-chart-yaxis-tick", text: "0" });

	const svg = plot.createSvg("svg", {
		cls: "rb-dashboard-chart",
		attr: { viewBox: `0 0 ${bars.length * 10} 40`, preserveAspectRatio: "none" },
	});

	// Gridlines are plain horizontal lines -- safe under the bars' non-uniform
	// scale, unlike text, since a horizontal line stretched non-uniformly is
	// still a horizontal line.
	svg.createSvg("line", { cls: "rb-dashboard-chart-gridline", attr: { x1: 0, y1: 0.5, x2: bars.length * 10, y2: 0.5 } });
	svg.createSvg("line", { cls: "rb-dashboard-chart-gridline", attr: { x1: 0, y1: 39.5, x2: bars.length * 10, y2: 39.5 } });

	bars.forEach((bar, i) => {
		// Zero-value buckets still get a hairline so the bucket is visibly
		// "there" rather than reading as a gap in the axis.
		const scale = bar.value === 0 ? 0.02 : bar.value / max;
		// Obsidian's createSvg passes `cls` straight to classList.add(), which
		// throws on a space-separated multi-class string (unlike createEl/
		// createDiv, which split it) -- pass an array instead so each class
		// becomes its own token. This is why the bug only showed up once a
		// bucket actually had click data: only that branch built a two-class
		// string.
		const rect = svg.createSvg("rect", {
			cls: bar.onClick ? ["rb-dashboard-chart-bar", "rb-dashboard-chart-bar--clickable"] : "rb-dashboard-chart-bar",
			attr: { x: i * 10 + 1, y: 0, width: 8, height: 40 },
		});
		rect.setCssProps({ "--rb-bar-scale": String(scale) });
		rect.createSvg("title", {}, (el) => { el.textContent = bar.hoverLabel; });
		if (bar.onClick) rect.addEventListener("click", bar.onClick);
	});

	const xAxis = wrap.createDiv({ cls: "rb-dashboard-chart-xaxis" });
	xAxis.createDiv({ cls: "rb-dashboard-chart-xaxis-spacer" }); // aligns under the y-axis column
	bars.forEach((bar, i) => {
		xAxis.createDiv({
			cls: "rb-dashboard-chart-xaxis-label",
			text: i % labelEvery === 0 ? bar.axisLabel : "",
		});
	});
}
