const withTableOfContents = require('./with-table-of-contents.js');
const withDetails = require('./with-details.js');

/**
 * Get the first post prior to the passed in post that satisfies the
 * filter function (if specified).
 * @param {Object} posts The eleventy collections.post object
 * @param {Object} page The eleventy page object
 * @param {function} filter A boolean function that the returned post
 * must satisfy.
 */
const getPreviousPost = (posts, page, filter) => {
	let lastSeenPost = null;
	for (let i = 0; i < posts.length; i++) {
		const post = posts[i];
		if (post.page.inputPath === page.inputPath) {
			return lastSeenPost;
		}
		if (!filter || filter(post)) {
			lastSeenPost = post;
		}
	}
	return null;
};

/**
 * Get the first post after the passed in post that satisfies the
 * filter function (if specified).
 * @param {Object} posts The eleventy collections.post object
 * @param {Object} page The eleventy page object
 * @param {function} filter A boolean function that the returned post
 * must satisfy.
 */
const getNextPost = (posts, page, filter) => {
	let lastSeenPost = null;
	for (let i = posts.length - 1; i >= 0; i--) {
		const post = posts[i];
		if (post.page.inputPath === page.inputPath) {
			return lastSeenPost;
		}
		if (!filter || filter(post)) {
			lastSeenPost = post;
		}
	}
	return null;
};

module.exports = {
	limit: (arr, limit) => arr.slice(0, limit),
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
	isTodayLearnedPost: (posts, page) => {
		for (post of posts) {
			if (post.page.inputPath === page.inputPath) {
				return post.data.isTodayLearned;
			}
		}
		return false;
	},
	getPreviousTodayLearnedPost: (posts, page) =>
		getPreviousPost(posts, page, (post) => post.data.isTodayLearned),
	getNextTodayLearnedPost: (posts, page) =>
		getNextPost(posts, page, (post) => post.data.isTodayLearned),
	getPreviousRegularPost: (posts, page) =>
		getPreviousPost(posts, page, (post) => !post.data.isTodayLearned),
	getNextRegularPost: (posts, page) =>
		getNextPost(posts, page, (post) => !post.data.isTodayLearned),
};
