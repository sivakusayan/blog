/**
 * Stores a static list of valid tags for posts in this blog to have.
 * Having an enforced list of tags allows us to do analysis on our posts
 * later if we wish.
 */
const VALID_TAGS = ['Accessibility', 'Career', 'C Programming', 'Compilers', 'Systems', 'General Programming'];
Object.freeze(VALID_TAGS);
// These are tags used by eleventy. We'll always consider them valid.
const ELEVENTY_RESERVED_TAGS = ['all', 'nav', 'post', 'posts'];
Object.freeze(ELEVENTY_RESERVED_TAGS);

const VALID_TAG_MAP = new Map();
for (tag of VALID_TAGS) {
	VALID_TAG_MAP.set(tag, 1);
}
for (tag of ELEVENTY_RESERVED_TAGS) {
	VALID_TAG_MAP.set(tag);
}
Object.freeze(VALID_TAG_MAP);

const isValidTag = (tag) => VALID_TAG_MAP.has(tag);

const filterTagList = (tags) => {
	return (tags || []).filter(
		(tag) => ['all', 'nav', 'post', 'posts'].indexOf(tag) === -1,
	);
};

/**
 * Collects a set of all tags used by posts in this blog,
 * throwing an error if a post uses an invalid Tag.
 * @param {Object} collection The eleventy collection object.
 * @param {function} postFilter Only collect tags from posts that return true
 * when passed to the postFilter function.
 * @returns
 */
const getTags = (collection, postFilter) => {
	let tagSet = new Set();
	collection.getAll().forEach((item) => {
		if (postFilter && !postFilter(item)) return;
		(item.data.tags || []).forEach((tag) => {
			if (!isValidTag(tag)) throw Error('Post has invalid tag: ' + tag);
			tagSet.add(tag);
		});
	});

	return filterTagList([...tagSet]).sort();
};

module.exports = {
	tagList: (collection) => getTags(collection),
};
