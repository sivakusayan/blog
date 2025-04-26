const allowedMarkdown = [
	'normalize',
	'block',
	'inline',
	'linkify',
	'autolink',
	'link',
	'backticks',
	'emphasis',
	'paragraph',
	'text',
	'newline',
	'list',
	'table',
	'blockquote',
	'code',
];

const isNode = () => {
    return typeof process === 'object';
}

if (isNode()) {
	module.exports = {
		allowedMarkdown,
	};
}
