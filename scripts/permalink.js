// Copied with slight changes from the original file
// in the markdown-it-anchor library
// https://github.com/valeriangalliat/markdown-it-anchor/blob/master/permalink.js

const permalinkSymbolMeta = {
    isPermalinkSymbol: true
}

function renderHref(slug) {
    return `#${slug}`
}

function renderAttrs(slug) {
    return {}
}

const commonDefaults = {
    class: 'header-anchor',
    symbol: '#',
    renderHref,
    renderAttrs
}

function makePermalink(renderPermalinkImpl) {
    function renderPermalink(opts) {
        opts = Object.assign({}, renderPermalink.defaults, opts)

        return (slug, anchorOpts, state, idx) => {
            return renderPermalinkImpl(slug, opts, anchorOpts, state, idx)
        }
    }

    renderPermalink.defaults = Object.assign({}, commonDefaults)
    renderPermalink.renderPermalinkImpl = renderPermalinkImpl

    return renderPermalink
}

const headerLink = makePermalink((slug, opts, anchorOpts, state, idx) => {
    const linkTokens = [
        Object.assign(new state.Token('link_open', 'a', 1), {
            attrs: [
                ...(opts.class ? [['class', opts.class]] : []),
                ['href', opts.renderHref(slug, state)],
                ...Object.entries(opts.renderAttrs(slug, state))
            ]
        }),
        ...(opts.safariReaderFix ? [new state.Token('span_open', 'span', 1)] : []),
        ...state.tokens[idx + 1].children,
        ...(opts.safariReaderFix ? [new state.Token('span_close', 'span', -1)] : []),
        Object.assign(new state.Token('span_open', 'span', 1), {
            // It's okay to hide this as it's a purely visual cue.
            // The heading is already semantically a link anyway.
            attrs: [['class', 'anchor'], ['aria-hidden', 'true']]
        }),
        Object.assign(new state.Token('html_inline', '', 0), { content: "#", meta: permalinkSymbolMeta }),
        new state.Token('span.close', 'span', -1),
        new state.Token('link_close', 'a', -1)
    ]

    state.tokens[idx + 1] = Object.assign(new state.Token('inline', '', 0), {
        children: linkTokens
    })
})

Object.assign(headerLink.defaults, {
    safariReaderFix: false
})

module.exports = {
    headerLink
}