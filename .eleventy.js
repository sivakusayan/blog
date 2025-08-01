const fs = require('fs');

const eleventy = require('@11ty/eleventy');
const pluginSyntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const pluginNavigation = require('@11ty/eleventy-navigation');
const pluginRss = require('@11ty/eleventy-plugin-rss');
const pluginBundler = require('@11ty/eleventy-plugin-bundle');
const postcss = require('postcss');
const cssnano = require('cssnano');
const uglifyJS = require('uglify-js');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItAttrs = require('markdown-it-attrs');
const mathjax3 = require('markdown-it-mathjax3');

const { processComments } = require('./scripts/process-comments.js');
const { headerLink } = require('./scripts/permalink.js');
const { tagList, todayLearnedTagList } = require('./scripts/collections.js');
const {
	limit,
	filterTagList,
	shortReadableDate,
	readableDate,
	htmlDateString,
	withTableOfContents,
	withDetails,
	getRegularPosts,
	getTodayLearnedPosts,
	isTodayLearnedPost,
	isMathPost,
	getPreviousTodayLearnedPost,
	getNextTodayLearnedPost,
	getPreviousRegularPost,
	getNextRegularPost,
	withCodeBlockCompressor,
} = require('./scripts/filters.js');

module.exports = async (eleventyConfig) => {
	eleventyConfig.addPassthroughCopy('src/css');
	eleventyConfig.addPassthroughCopy('src/fonts');
	eleventyConfig.addPassthroughCopy('src/favicon');
	eleventyConfig.addPassthroughCopy('src/posts/resources');
	eleventyConfig.addPassthroughCopy('src/scripts');

	const baseURL =
		process.env.ENVIRONMENT === 'production'
			? 'https://sayansivakumaran.com'
			: 'http://localhost:8080';
	eleventyConfig.addPlugin(eleventy.HtmlBasePlugin, {
		baseHref: baseURL,
	});
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

	eleventyConfig.addFilter('limit', limit);
	eleventyConfig.addFilter('filterTagList', filterTagList);
	eleventyConfig.addFilter('shortReadableDate', shortReadableDate);
	eleventyConfig.addFilter('readableDate', readableDate);
	eleventyConfig.addFilter('htmlDateString', htmlDateString);
	eleventyConfig.addFilter('withTableOfContents', withTableOfContents);
	eleventyConfig.addFilter('withCodeBlockCompressor', withCodeBlockCompressor);
	eleventyConfig.addFilter('withDetails', withDetails);
	eleventyConfig.addFilter('getRegularPosts', getRegularPosts);
	eleventyConfig.addFilter('getTodayLearnedPosts', getTodayLearnedPosts);
	eleventyConfig.addFilter('isTodayLearnedPost', isTodayLearnedPost);
	eleventyConfig.addFilter('isMathPost', isMathPost);
	eleventyConfig.addFilter(
		'getPreviousTodayLearnedPost',
		getPreviousTodayLearnedPost,
	);
	eleventyConfig.addFilter('getNextTodayLearnedPost', getNextTodayLearnedPost);
	eleventyConfig.addFilter('getPreviousRegularPost', getPreviousRegularPost);
	eleventyConfig.addFilter('getNextRegularPost', getNextRegularPost);

	eleventyConfig.addFilter('dateOnly', function (dateVal, locale = 'en-us') {
		var theDate = new Date(dateVal);
		const options = {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
		};
		return theDate.toLocaleDateString(locale, options);
	});

	eleventyConfig.addFilter('timeOnly', function (dateVal, locale = 'en-us') {
		var theDate = new Date(dateVal);
		const options = {
			hour: '2-digit',
			minute: '2-digit',
		};

		return theDate.toLocaleTimeString('en-US', options);
	});

	eleventyConfig.addCollection('tagList', tagList);
	eleventyConfig.addCollection('todayLearnedTagList', todayLearnedTagList);

	// Customize Markdown library and settings:
	const markdownItMathTemml = await import('markdown-it-math/temml');
	let markdownLibrary = markdownIt({
		html: true,
		linkify: true,
	})
		.use(markdownItAttrs)
		.use(markdownItAnchor, {
			permalink: headerLink({
				safariReaderFix: true,
			}),
			level: [1, 2, 3, 4],
			slugify: eleventyConfig.getFilter('slugify'),
		});
	eleventyConfig.setLibrary('md', markdownLibrary);

	eleventyConfig.addCollection('postsWithComments', async (collection) => {
		await processComments(collection);
		return [];
	});

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
