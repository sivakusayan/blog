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
    'fence',
];

const isNode = () => {
    return typeof process === 'object';
}

if (isNode()) {
	module.exports = {
		allowedMarkdown,
	};
}
