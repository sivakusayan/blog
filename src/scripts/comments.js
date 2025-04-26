/**
 * Javascript enhancements for commenting functionality.
 */

/**
 * 1. Allow users to preview how their markdown comments will render
 *    once the comment is accepted.
 */
const MARKDOWN_SCRIPT_SRC =
	'https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.2/markdown-it.min.js';
const markdownScriptExists = () => {
	return !!document.querySelector('script[src*="markdown-it"]');
};

/**
 * Ensures that the passed in function runs while the markdown script
 * is loaded. Immediately invokes the callback if the markdown script
 * is already loaded.
 */
const withMarkdownItScript = (callback) => {
	if (markdownScriptExists()) {
		callback();
		return;
	}

	const markdownScript = document.createElement('script');
	markdownScript.setAttribute('src', MARKDOWN_SCRIPT_SRC);
	document.head.appendChild(markdownScript);
	markdownScript.onload = () => {
		callback();
	};
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
		previewButton.innerHTML = 'Loading <code>markdown-it</code> library...';
		previewButton.setAttribute('aria-disabled', 'true');

		withMarkdownItScript(() => {
			previewButton.innerHTML = oldButtonText;
			previewButton.removeAttribute('aria-disabled');

			const md = window
				.markdownit('zero', { linkify: true })
				.enable(allowedMarkdown);
			document.getElementById(`preview-content-root:${id}`).innerHTML =
				md.render(content);
			dialog.showModal();
		});
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
    }
    form.onsubmit = (e) => {
        localStorage.removeItem(key);
    }
}
