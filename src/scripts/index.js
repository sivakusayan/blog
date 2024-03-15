document.documentElement.classList.remove('script-disabled');

// Browsers don't currently seem to make overflow elements focusable
// by default. So let's do it ourselves, so keyboard users
// can scroll code blocks.
const codeElements = document.querySelectorAll('pre');
for (const code of codeElements) {
	if (code.scrollWidth > code.clientWidth) {
		code.tabIndex = 0;
		// As soon as it's focusable, we'll unfortunately need to give this
		// an accname since this element will otherwise have an overly verbose
		// accname of its contents, which will probably be many, MANY lines of
		// code.
		code.ariaLabel = 'Code Snippet';
		code.setAttribute('role', 'region');
	}
}

const isDarkMode = () => {
	const root = document.documentElement;
	if (root.getAttribute("data-theme") === Themes.DARK) {
		return true;
	}
	if (root.getAttribute("data-theme") === Themes.SYSTEM
		&& window.matchMedia
		&& window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return true;
	}
	return false;
}

const initCanvasBubbles = () => {
	var canvas = document.getElementById('canvas');
	if (canvas) {
		var ctx = canvas.getContext('2d');
		if (ctx) {
			var refresh = () => {
				width = Math.min(
					document.documentElement.offsetWidth,
					canvas.parentElement.offsetWidth*1.2
				);
				height = canvas.parentElement.offsetHeight*1.6;
				canvas.width = width;
				canvas.height = height;
				// If our volume is too small, having more circles
				// looks jank
				const numCircles = width*height < 70000 ? 20 : 30;
				maxRadius = 50;
				ctx.clearRect(0, 0, width, height);
				const darkMode = isDarkMode();
				for (i = 0; i < numCircles; i++) {
					var radius = Math.floor(Math.random() * maxRadius);
					if (radius < maxRadius/3) radius = maxRadius;
					var x = Math.floor(Math.random() * width);
					if (x < maxRadius) x = maxRadius;
					if ((width - x) < maxRadius) x-= maxRadius;
					var y = Math.floor(Math.random() * height);
					if (y < maxRadius) y = maxRadius;
					if ((height - y) < maxRadius) y-= maxRadius;

					if(darkMode) {
						var r = Math.floor(Math.random() * 0);
						var g = 120 + Math.floor(Math.random() * 100);
						var b = 200;
						var opacity = .06;
					}
					else {
						var r = Math.floor(Math.random() * 100);
						var g = Math.floor(Math.random() * 150);
						var b = 255;
						var opacity = .05;
					}

					ctx.beginPath();
					ctx.arc(x, y, radius, Math.PI * 2, 0, false);
					ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
					ctx.fill();
					ctx.closePath();
				}
			};
			refresh();
			// We'll need to redraw the bubbles when the theme changes so
			// the colors don't clash with the new theme.
			document.documentElement.addEventListener("theme-changed", refresh);

			// We'll also need to redraw when the window is resized to resize
			// the canvas.
			var timeoutId;
			window.onresize = function(){
  				clearTimeout(timeoutId);
  				timeoutId = setTimeout(refresh, 100);
			};
		}
	}
}
initCanvasBubbles();