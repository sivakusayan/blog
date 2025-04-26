const markdownIt = require('markdown-it');
const { allowedMarkdown } = require('../constants.js');

/**
 * For each post, constructs a tree hierarchy of comments from
 * the flat list of comments in the data hierarchy.
 */
processComments = (collection) => {
	collection.getFilteredByTag('posts').forEach(function (item) {
		// If a post doesn't have any comments, we don't need to
		// do any further processing.
		if (!item.data.comments[item.fileSlug]) return;

		const md = markdownIt('zero', { linkify: true }).enable(allowedMarkdown);

		let comments = Object.values(item.data.comments[item.fileSlug]);
		comments = comments.map((comment) => ({
			...comment,
			message: md.render(comment.message),
			date: new Date(comment.date * 1000),
		}));

		// Okay, here is the reconciliation process. All we do
		// is store off all the second-level comments in an object,
		// then add them back to the appropriate parent at the end.
		const topLevelComments = [];
		const orphans = {};
		for (comment of comments) {
			if (!comment.parent) {
				topLevelComments.push(comment);
				continue;
			}
			if (!orphans[comment.parent]) {
				orphans[comment.parent] = [];
			}
			orphans[comment.parent].push(comment);
		}

		// Child comments should be sorted from oldest to newest, simulating
		// a forum thread.
		for (comment of topLevelComments) {
			if (!orphans[comment._id]) {
				continue;
			}
			comment.children = orphans[comment._id];
			comment.children.sort((comment1, comment2) => {
				return comment2.date - comment1.date;
			});
		}

		// On the other hand, top-level comments should be sorted from newest
		// to oldest, so we see the most recent ones first.
		topLevelComments.sort((comment1, comment2) => {
			return comment1.date - comment2.date;
		});

		item.data.staticmanEntries = topLevelComments;
	});
};

module.exports = {
	processComments,
};
