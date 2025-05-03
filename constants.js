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

const isNodeRuntime = () => {
    return typeof process === 'object';
}

if (isNodeRuntime()) {
	module.exports = {
		allowedMarkdown,
	};
}
