const mathJaxButton = document.getElementById('math-jax-button');
const mathMLButton = document.getElementById('math-ml-button');
let currentToggledMathButton = mathJaxButton;

const MathRenderer = Object.freeze({
	MATH_JAX: 'MATH_JAX',
	MATH_ML: 'MATH_ML'
});

const setMathRenderer = (renderer) => {
	localStorage.mathRenderer = renderer;
	updatePressedMathRendererButton(renderer);
};

// Update our list of math buttons so that the correct one
// has the 'pressed' state.
const updatePressedMathRendererButton = (renderer) => {
	if (currentToggledMathButton) {
		currentToggledMathButton.setAttribute('aria-pressed', 'false');
	}
	switch (renderer) {
		case MathRenderer.MATH_JAX:
			currentToggledMathButton = mathJaxButton;
			break;
		case MathRenderer.MATH_ML:
			currentToggledMathButton = mathMLButton;
			break;
		default:
			break;
	}
	currentToggledMathButton.setAttribute('aria-pressed', 'true');
};

mathJaxButton.onclick = (e) => setMathRenderer(MathRenderer.MATH_JAX);
mathMLButton.onclick = (e) => setMathRenderer(MathRenderer.MATH_ML);

// We don't need to restore the theme here when the page loads.
// We load it at the end of the <head> tag to prevent FOUS.
if ('mathRenderer' in localStorage) setMathRenderer(localStorage.mathRenderer);
