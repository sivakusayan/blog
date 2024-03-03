/**
 * Eleventy plugin that will take any <table-of-contents> tag in a markdown post and replace it with a
 * table of contents. All of the headings are required to have an ID so we can link to it.
 * 
 * This code is terrible and weird. Sorry :)
 */
const cheerio = require('cheerio');

const getLevel = (heading) => {
    return parseInt(heading.name[1]);
}

const buildHeadings = ($headings, $) => {
    const headingList = [];

    $headings.each((i, heading) => {
        const level = getLevel(heading);
        const entry = {
            text: $(heading).text().replace("#", ""),
            slug: $(heading).attr("id"),
            level: level,
        }
        headingList.push(entry);
    });
    return headingList;
}

module.exports = (content) => {
    const $ = cheerio.load(content.val, null, false);
    const $headings = $('h2, h3');
    const headingList = buildHeadings($headings, $);

    // Build the table of contents
    $('table-of-contents').replaceWith("<details><summary>Table of Contents</summary><nav id='toc' class='toc'></nav></details>");
    $('#toc').append("<ol></ol>");
    const root = $('#toc > ol');
    for (const heading of headingList) {
        if (heading.level === 2) {
            root.append(`<li><a href="#${heading.slug}">${heading.text}</a></li>`);
        }
        else if (heading.level === 3) {
            let parent = root.children('li:last-child').find('ol');
            if (parent.length === 0) {
                root.children('li:last-child').append("<ol></ol>");
                parent = root.children('li:last-child').find('ol');
            }
            parent.append(`<li><a href="#${heading.slug}">${heading.text}</a></li>`);
        }
    }

    content.val = $.html();
    return content;
}