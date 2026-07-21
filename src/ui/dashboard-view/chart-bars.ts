/**
 * Generic, reusable SVG bar chart. No axis, no legend -- a handful of bars
 * read fine at a glance without either. Bar height is the one runtime-computed
 * value here, so it's driven by a CSS custom property (scaleY transform) rather
 * than an inline style assignment, matching the plugin's no-inline-style rule.
 */
export interface BarChartDatum {
	label: string;
	value: number;
}

export function renderBarChart(container: HTMLElement, data: BarChartDatum[]): void {
	const max = Math.max(1, ...data.map((d) => d.value));
	const svg = container.createSvg("svg", {
		cls: "rb-dashboard-chart",
		attr: { viewBox: `0 0 ${data.length * 10} 40`, preserveAspectRatio: "none" },
	});

	data.forEach((d, i) => {
		// Zero-value weeks still get a hairline so the week is visibly "there"
		// rather than reading as a gap in the axis.
		const scale = d.value === 0 ? 0.02 : d.value / max;
		const bar = svg.createSvg("rect", {
			cls: "rb-dashboard-chart-bar",
			attr: { x: i * 10 + 1, y: 0, width: 8, height: 40 },
		});
		bar.setCssProps({ "--rb-bar-scale": String(scale) });
		bar.createSvg("title", {}, (el) => { el.textContent = `Week of ${d.label}: ${d.value} cooked`; });
	});
}
