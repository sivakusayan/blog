const canvas = document.getElementById('canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

const onWindowDoneResizing = (callback) => {
	let previousWidth = window.outerWidth;

	// We only want to fire the callback if the width
	// ACTUALLY changed. This mitigates against quirks in the
	// browser where resize events are constantly fired due
	// to appearing and dissappearing scrollbars.
	let fire = () => {
		if (window.outerWidth !== previousWidth) {
			console.log('hi');
			previousWidth = window.outerWidth;
			callback();
		}
	};

	let timeoutId;
	window.addEventListener('resize', () => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(fire, 100);
	});
};

/**
 * Generates a random color for the circle.
 * Will generate a different set of colors depending
 * on the active theme.
 * @param {boolean} darkMode True if dark mode is on.
 * @returns
 */
const generateCircleFillStyle = (darkMode) => {
	let r, g, b, opacity;
	if (darkMode) {
		r = Math.floor(Math.random() * 0);
		g = 120 + Math.floor(Math.random() * 100);
		b = 200;
		opacity = 0.06;
	} else {
		r = Math.floor(Math.random() * 100);
		g = Math.floor(Math.random() * 150);
		b = 255;
		opacity = 0.05;
	}
	return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
};

const generateCircleCoordinates = (canvasWidth, canvasHeight, maxRadius) => {
	let radius = Math.floor(Math.random() * maxRadius);
	if (radius < maxRadius / 3) radius = maxRadius;

	let x = Math.floor(Math.random() * canvasWidth);
	// We don't ever want circles cut off by the canvas boundary.
	// If the center of the circle is "too close", push it away.
	//
	// Of course, this logic assumes that 2*maxRadius is always less than the
	// canvasWidth.
	if (x < maxRadius) x = maxRadius;
	if (width - x < maxRadius) x -= maxRadius;

	let y = Math.floor(Math.random() * canvasHeight);
	// Ditto for what we did above.
	if (y < maxRadius) y = maxRadius;
	if (height - y < maxRadius) y -= maxRadius;

	return { x, y, radius };
};

const drawCircle = (context, params) => {
	context.beginPath();
	context.arc(params.x, params.y, params.radius, Math.PI * 2, 0, false);
	context.fillStyle = params.fill;
	context.fill();
	context.closePath();
};

/**
 * Redraws the canvas so that it fits in "nicely" within the parent.
 * Returns the new width and height of the canvas.
 *
 * Note that the canvas will always be slightly larger than the canvas.
 * This is to make sure the bubbles will always extend slightly outside
 * the boundaries of the parent.
 */
const resizeCanvasToParent = () => {
	width = Math.min(
		document.documentElement.offsetWidth,
		canvas.parentElement.offsetWidth * 1.2,
	);
	height = canvas.parentElement.offsetHeight * 1.6;
	canvas.width = width;
	canvas.height = height;
	return { width, height };
};

const initCanvasBubbles = () => {
	if (ctx) {
		const refresh = () => {
			const { width, height } = resizeCanvasToParent();
			ctx.clearRect(0, 0, width, height);
			// If our volume is too small, having more circles
			// looks jank
			const volume = width * height;
			const numCircles = volume < 70000 ? 20 : 30;
			maxRadius = volume < 70000 ? 40 : 50;
			const darkMode = isDarkMode();
			for (i = 0; i < numCircles; i++) {
				const { x, y, radius } = generateCircleCoordinates(
					width,
					height,
					maxRadius,
				);
				const fill = generateCircleFillStyle(darkMode);
				drawCircle(ctx, { x, y, radius, fill });
			}
		};
		refresh();
		// We'll need to redraw the bubbles when the theme changes so
		// the colors don't clash with the new theme.
		document.documentElement.addEventListener('theme-changed', refresh);

		// We'll also need to redraw the canvas when the window size changes,
		// since the canvas might otherwise look weird on the new page size.
		onWindowDoneResizing(refresh);
	}
};
initCanvasBubbles();
