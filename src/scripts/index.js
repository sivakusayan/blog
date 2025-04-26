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

const messages = [
	'Loading markdown parser .',
	'Loading markdown parser . .',
	'Loading markdown parser . . .',
	'Loading markdown parser . . . .',
];

const buttonsControllingDialogs = document.querySelectorAll(
	'button[data-dialog]',
);
for (const button of buttonsControllingDialogs) {
	const dialog = document.getElementById(button.getAttribute('data-dialog'));
	const closeButton = document.getElementById(
		button.getAttribute('data-close'),
	);
	let intervalId;
	button.addEventListener('click', () => {
		const id = button.getAttribute('data-dialog').split('-')[1];
		const content = document.getElementById(`message-${id}`).value;

		dialog.showModal();
		let i = 0;
		intervalId = setInterval(() => {
			document.getElementById(`preview-content-root-${id}`).innerHTML =
				messages[i];
			i += 1;
			i = i % messages.length;
		}, 200);
		setTimeout(() => {
			clearInterval(intervalId);
			document.getElementById(`preview-content-root-${id}`).innerHTML = content;
		}, 8000);
	});
	closeButton.addEventListener('click', () => {
		clearInterval(intervalId);
		dialog.close();
	});
}
