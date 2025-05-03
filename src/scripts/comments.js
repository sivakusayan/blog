/**
 * Javascript enhancements for commenting functionality.
 */

const SVG_LOADER = `<svg aria-hidden="true" class="loader" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.spinner_9y7u{animation:spinner_fUkk 2.4s linear infinite;animation-delay:-2.4s}.spinner_DF2s{animation-delay:-1.6s}.spinner_q27e{animation-delay:-.8s}@keyframes spinner_fUkk{8.33%{x:13px;y:1px}25%{x:13px;y:1px}33.3%{x:13px;y:13px}50%{x:13px;y:13px}58.33%{x:1px;y:13px}75%{x:1px;y:13px}83.33%{x:1px;y:1px}}</style><rect class="spinner_9y7u" x="1" y="1" rx="1" width="10" height="10"/><rect class="spinner_9y7u spinner_DF2s" x="1" y="1" rx="1" width="10" height="10"/><rect class="spinner_9y7u spinner_q27e" x="1" y="1" rx="1" width="10" height="10"/></svg>`;
const MARKDOWN_SCRIPT_SRC =
	'https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.2/markdown-it.min.js';
const MARKDOWN_MATH_SCRIPT_SRC =
	'https://cdn.jsdelivr.net/npm/markdown-it-math@5.2.0/index.min.js';
const markdownScriptExists = () => {
	return !!document.querySelector('script[src*="markdown-it"]');
};

/**
 * 1. Allow users to preview how their markdown comments will render
 *    once the comment is accepted.
 */

/**
 * Ensures that the passed in function runs while both Markdown and TeX
 * scripts are loaded. Immediately invokes the callback if the scripts
 * were already loaded.
 */
const withMathFormattingScripts = async (callback) => {
	if (window.markdownIt && window.markdownItMathTemml) {
		callback();
		return;
	}
	// Eagerly load the temml script, because it's a dependency we
	// will indirectly need anyway.
	const [markdownIt, markdownItMathTemml] = await Promise.all([
		import('markdown-it'),
		import('markdown-it-math/temml'),
		import('temml'),
	]);

	window.markdownIt = markdownIt.default;
	window.markdownItMathTemml = markdownItMathTemml.default;
	callback();
};

const withMarkdownFormattingScripts = async (callback) => {
	if (window.markdownIt) {
		callback();
		return;
	}
	const markdownIt = await import('markdown-it');
	window.markdownIt = markdownIt.default;
	callback();
};

const markdownPreviewButtons = document.querySelectorAll('button[data-dialog]');
for (const previewButton of markdownPreviewButtons) {
	const dialog = document.getElementById(
		previewButton.getAttribute('data-dialog'),
	);
	const closeButton = document.getElementById(
		previewButton.getAttribute('data-close'),
	);

	previewButton.addEventListener('click', () => {
		// We are currently loading the markdown script - don't allow
		// multiple invocations of the click handler.
		if (previewButton.getAttribute('aria-disabled')) {
			return;
		}

		const id = previewButton.getAttribute('data-dialog').split(':')[1];
		const content = document.getElementById(`message:${id}`).value;

		const oldButtonText = previewButton.innerHTML;
		let newText = 'Loading formatting libraries...';
		const prefersReducedMotion = window.matchMedia(
			'(prefers-reduced-motion: reduce)',
		).matches;
		if (!prefersReducedMotion) {
			newText =
				SVG_LOADER + `<span style="margin-left: 1.5rem">${newText}</span>`;
		}
		previewButton.innerHTML = newText;
		previewButton.setAttribute('aria-disabled', 'true');

        // The markdown math parser is an extremely heavy dependency. While we don't have a great
        // way to detect if the content has LaTeX in it without lots of code, this is a reasonably
        // good heuristic.
		const probablyNeedsMath = content.indexOf('$') > -1;
		const onScriptDependenciesLoaded = () => {
			previewButton.innerHTML = oldButtonText;
			previewButton.removeAttribute('aria-disabled');

			// Todo: Do we want to support syntax highlighting?
			let md = markdownIt('zero', {
				linkify: true,
				highlight: (str) =>
					`<pre class='language-text'><code>${md.utils.escapeHtml(str)}</code></pre>`,
			}).enable(allowedMarkdown);

			if (window.markdownItMathTemml) {
				md = md.use(window.markdownItMathTemml);
			}

			document.getElementById(`preview-content-root:${id}`).innerHTML =
				md.render(content);

			// As mentioned in the MathJax documents, MathJax will not automatically
			// detect newly inserted MathML. We need to do this manually to properly format
			// any potentially rendered math.
			if (MathJax && MathJax.typeset) {
				MathJax.typeset();
			}

			dialog.showModal();
		};

		if (probablyNeedsMath) {
			withMathFormattingScripts(onScriptDependenciesLoaded);
		} else {
			withMarkdownFormattingScripts(onScriptDependenciesLoaded);
		}
	});
	closeButton.addEventListener('click', () => {
		dialog.close();
	});
}

/**
 * 2. Stores unfinished comment text in local storage, so the user can
 *    finish their comment later.
 */
for (const previewButton of markdownPreviewButtons) {
	// The markdown preview buttons happen to contain the ID we need to reference everything
	// in the commenting form, so let's just abuse that. Could this be written better? Probably.
	const id = previewButton.getAttribute('data-dialog').split(':')[1];
	const commentTextArea = document.getElementById(`message:${id}`);
	const form = document.getElementById(`form:${id}`);
	const key = window.location.pathname + id;

	const preExistingContent = localStorage.getItem(key);
	if (preExistingContent) {
		commentTextArea.value = preExistingContent;
	}

	commentTextArea.oninput = (e) => {
		localStorage.setItem(key, commentTextArea.value);
	};
	form.onsubmit = (e) => {
		localStorage.setItem('keyToRemoveOnSuccess', key);
	};
}

// Clears the cache of any drafted comments if form submission was successful.
if (window.location.pathname === '/comment-submitted/') {
	const keyToRemove = localStorage.getItem('keyToRemoveOnSuccess');
	localStorage.removeItem(keyToRemove);
}
localStorage.removeItem('keyToRemoveOnSuccess');
