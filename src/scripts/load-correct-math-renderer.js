const MATH_JAX_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/mml-chtml.min.js';
const mathRenderer = localStorage?.mathRenderer || "MATH_JAX";

const appendLinkElement = (href, opts) => {
	const link = document.createElement('link');
    link.setAttribute("href", href);
	for (const key in opts) {
		link.setAttribute(key, opts[key]);
	}
	document.head.appendChild(link);
};

console.log(mathRenderer);

if (mathRenderer === "MATH_JAX") {
	const script = document.createElement('script');
	script.setAttribute('src', MATH_JAX_SRC);
	document.head.appendChild(script);
} else {
	appendLinkElement('/fonts/latinmodernmath.woff2', {
		type: 'font/woff2',
		as: 'font',
	});
	appendLinkElement('/fonts/Temml.woff2', {
		type: 'font/woff2',
		as: 'font',
	});
	appendLinkElement('/css/third_party/Temml-Latin-Modern.css', {
		rel: 'stylesheet',
	});
}
