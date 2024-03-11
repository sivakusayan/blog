/**
 * Automatically wraps the content of a details element in a div with a class so we can do certain CSS magic.
 */

const cheerio = require('cheerio');

module.exports = content => {
	const $ = cheerio.load(content.val, null, false);
	const $details = $('details');

	$details.each((i, details) => {
		let rawHTML = $(details).html();
		const contentStart = rawHTML.indexOf('</summary>') + 10;
		const content = rawHTML.substring(contentStart);
		rawHTML =
			rawHTML.substring(0, contentStart) +
			`<div class='details-content'>${content}</div>`;
		$(details).replaceWith('<details>' + rawHTML + '</details>');
	});

	content.val = $.html();
	return content;
};
