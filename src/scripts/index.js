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

var canvas = document.getElementById('canvas');
if (canvas) {
	var ctx = canvas.getContext('2d');
    width = canvas.parentElement.offsetWidth;
    height = canvas.parentElement.offsetHeight;
    canvas.width = width + 200;
    canvas.height = height + 200;
    maxRadius = 50;
	var refresh = function () {
		ctx.clearRect(0, 0, width, height);
		for (i = 0; i < 20; i++) {
            var radius = Math.floor(Math.random() * maxRadius);
			if (radius < maxRadius/3) radius = maxRadius;
			var x = Math.floor(Math.random() * width);
            if (x < radius) x = radius;
            if ((width - x) < radius) x-= radius;
			var y = Math.floor(Math.random() * height);
            if (y < radius) y = radius;
			
			var r = Math.floor(Math.random() * 100);
			var g = Math.floor(Math.random() * 150);
			var b = Math.floor(Math.random() * 255);

			ctx.beginPath();
			ctx.arc(x, y, radius, Math.PI * 2, 0, false);
			ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + 255 + ',0.1)';
			ctx.fill();
			ctx.closePath();
		}
	};
	refresh();
}
