/**
 * Adds the 'compress' class to code blocks that are really small,
 * so that we don't get awkwardly huge code blocks with barely any content
 * to fill them.
 */

const cheerio = require('cheerio');

module.exports = (content) => {
	const $ = cheerio.load(content.val, null, false);
	const $pre = $('pre');

	$pre.each((i, pre) => {
		let text = $(pre)
			.children('code')
			.find('br')
			.replaceWith('\n')
			.end()
			.text();
		const lines = text.split('\n');
		let longestLineLength = 0;
		for (line of lines) {
			if (line.length > longestLineLength) longestLineLength = line.length;
		}
		if (longestLineLength < 67) {
			$(pre).addClass('compress');
		}
	});

	content.val = $.html();
	return content;
};
