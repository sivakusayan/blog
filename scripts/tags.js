/**
 * Stores a static list of valid tags for posts in this blog to have.
 * Having an enforced list of tags allows us to do analysis on our posts
 * later if we wish.
 */

// These are tags used by eleventy. We'll always consider them valid.
const eleventyReservedTags = ['all', 'nav', 'post', 'posts'];
const validTags = ['Accessibility', 'Career', 'Systems'];

const validTagMap = new Map();
for (validTag of validTags) {
	validTagMap.set(validTag, 1);
}

const eleventyReservedTagMap = new Map();
for (reservedTag of eleventyReservedTags) {
	eleventyReservedTagMap.set(reservedTag, 1);
}

module.exports = tag => eleventyReservedTagMap.has(tag) || validTagMap.has(tag);
