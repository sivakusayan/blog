const MARKDOWN_SCRIPT_SRC =
	'https://cdnjs.cloudflare.com/ajax/libs/markdown-it/13.0.2/markdown-it.min.js';
const markdownScriptExists = () => {
	return !!document.querySelector('script[src*="markdown-it"]');
};
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

const buttonsControllingDialogs = document.querySelectorAll(
	'button[data-dialog]',
);
for (const openButton of buttonsControllingDialogs) {
	const dialog = document.getElementById(
		openButton.getAttribute('data-dialog'),
	);
	const closeButton = document.getElementById(
		openButton.getAttribute('data-close'),
	);

	openButton.addEventListener('click', () => {
        if (openButton.getAttribute('aria-disabled')) {
            return;
        }

		const id = openButton.getAttribute('data-dialog').split(':')[1];
		const content = document.getElementById(`message:${id}`).value;

		const oldButtonText = openButton.innerHTML;
		openButton.innerHTML = 'Loading <code>markdown-it</code> library...';
		openButton.setAttribute('aria-disabled', 'true');

		withMarkdownItScript(() => {
			openButton.innerHTML = oldButtonText;
			openButton.removeAttribute('aria-disabled');

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
