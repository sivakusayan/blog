const fs = require('fs');

const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const { headerLink } = require('./scripts/permalink.js');
const toc = require('./scripts/toc.js');
const details = require('./scripts/details.js');
const { tagList, todayLearnedTagList } = require('./scripts/collections.js');
const {
	filterTagList,
	shortReadableDate,
	readableDate,
} = require('./scripts/filters.js');

const pluginSyntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const pluginNavigation = require('@11ty/eleventy-navigation');
const pluginRss = require('@11ty/eleventy-plugin-rss');
const pluginBundler = require('@11ty/eleventy-plugin-bundle');
const postcss = require('postcss');
const cssnano = require('cssnano');
const uglifyJS = require('uglify-js');

module.exports = function (eleventyConfig) {
	eleventyConfig.addPassthroughCopy('src/css');
	eleventyConfig.addPassthroughCopy('src/fonts');
	eleventyConfig.addPassthroughCopy('src/favicon');
	eleventyConfig.addPassthroughCopy('src/posts/resources');
	eleventyConfig.addPassthroughCopy('src/scripts');

	eleventyConfig.addPlugin(pluginSyntaxHighlight);
	eleventyConfig.addPlugin(pluginNavigation);
	eleventyConfig.addPlugin(pluginRss);
	eleventyConfig.addPlugin(pluginBundler, {
		transforms: [
			async function (code) {
				if (this.type === 'css') {
					let result = await postcss([cssnano]).process(code, {
						from: this.page.inputPath,
						to: null,
					});
					return result.css;
				}
				if (this.type === 'js') {
					let minified = uglifyJS.minify(code);
					if (minified.error) {
						console.log('UglifyJS error: ', minified.error);
						return code;
					}
					return minified.code;
				}
				return code;
			},
		],
	});

	eleventyConfig.addFilter('filterTagList', filterTagList);
	eleventyConfig.addFilter('shortReadableDate', shortReadableDate);
	eleventyConfig.addFilter('readableDate', readableDate);

	// https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-date-string
	eleventyConfig.addFilter('htmlDateString', dateObj => {
		return dateObj.toISOString();
	});

	eleventyConfig.addFilter('toc', toc);
	eleventyConfig.addFilter('details', details);
	eleventyConfig.addFilter('getRegularPosts', posts => {
		return posts.filter(post => !post.data.isTodayLearned);
	});
	eleventyConfig.addFilter('getTodayLearnedPosts', posts => {
		return posts.filter(post => post.data.isTodayLearned);
	});

	eleventyConfig.addCollection('tagList', tagList);
	eleventyConfig.addCollection('todayLearnedTagList', todayLearnedTagList);

	eleventyConfig.addFilter('getTest', page => {
		console.log(page.data);
	});

	// Customize Markdown library and settings:
	let markdownLibrary = markdownIt({
		html: true,
		linkify: true,
	}).use(markdownItAnchor, {
		permalink: headerLink({
			safariReaderFix: true,
		}),
		level: [1, 2, 3, 4],
		slugify: eleventyConfig.getFilter('slugify'),
	});
	eleventyConfig.setLibrary('md', markdownLibrary);

	// Override Browsersync defaults (used only with --serve)
	eleventyConfig.setBrowserSyncConfig({
		callbacks: {
			ready: function (err, browserSync) {
				const content_404 = fs.readFileSync('_site/404.html');

				browserSync.addMiddleware('*', (req, res) => {
					// Provides the 404 content without redirect.
					res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
					res.write(content_404);
					res.end();
				});
			},
		},
		ui: false,
		ghostMode: false,
	});

	eleventyConfig.addWatchTarget('./src/css/index.css');

	return {
		// Control which files Eleventy will process
		// e.g.: *.md, *.njk, *.html, *.liquid
		templateFormats: ['md', 'njk', 'html', 'liquid'],

		// Pre-process *.md files with: (default: `liquid`)
		markdownTemplateEngine: 'njk',

		// Pre-process *.html files with: (default: `liquid`)
		htmlTemplateEngine: 'njk',

		// -----------------------------------------------------------------
		// If your site deploys to a subdirectory, change `pathPrefix`.
		// Don’t worry about leading and trailing slashes, we normalize these.

		// If you don’t have a subdirectory, use "" or "/" (they do the same thing)
		// This is only used for link URLs (it does not affect your file structure)
		// Best paired with the `url` filter: https://www.11ty.dev/docs/filters/url/

		// You can also pass this in on the command line using `--pathprefix`

		// Optional (default is shown)
		pathPrefix: '/',
		// -----------------------------------------------------------------

		// These are all optional (defaults are shown):
		dir: {
			input: 'src',
			includes: '_includes',
			data: '_data',
			output: '_site',
		},
	};
};
