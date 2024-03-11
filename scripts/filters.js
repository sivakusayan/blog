const withTableOfContents = require('./with-table-of-contents.js');
const withDetails = require('./with-details.js');

module.exports = {
	// Given a list of tags, filter out all tags that were added by the eleventy system itself.
	// In essense, this function gives us only the "useful" tags we care about, eg. the tags
	// we defined in our frontmatter.
	filterTagList: (tags) =>
		(tags || []).filter(
			(tag) => ['all', 'nav', 'post', 'posts'].indexOf(tag) === -1,
		),
	shortReadableDate: (dateObj) => {
		return dateObj.toLocaleDateString(undefined, {
			month: 'short',
			day: '2-digit',
			year: 'numeric',
		});
	},
	readableDate: (dateObj) => {
		return dateObj.toLocaleDateString(undefined, {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
	},
	htmlDateString: (dateObj) => dateObj.toISOString(),
	withTableOfContents: withTableOfContents,
	withDetails: withDetails,
	// We want to show "regular" posts in a separate section from our "today-i-learned" posts.
	getRegularPosts: (posts) => posts.filter((post) => !post.data.isTodayLearned),
	getTodayLearnedPosts: (posts) =>
		posts.filter((post) => post.data.isTodayLearned),
};
