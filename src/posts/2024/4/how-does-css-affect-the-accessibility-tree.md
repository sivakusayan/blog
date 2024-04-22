---
title: How does CSS affect the accessibility tree?
description: HTML isn't the only thing that can affect the output of the accessibility tree. CSS can change the accessibility tree too - some ways are in the specifications themselves, while others are implementation dependent.
date: 2024-04-20
tags:
  - Accessibility
layout: layouts/post.njk
---

Anecdotally, it seems to be a common misconception that HTML is the only thing that affects the
[accessibility tree](https://developer.mozilla.org/en-US/docs/Glossary/Accessibility_tree).
If you've been doing accessibility for a while, you probably know that the CSS `display` property is
one counterexample of that. However, there are lots of other examples of CSS affecting the
accessibility tree, with most of them not being explicitly defined in any specification I'm aware of
under the ARIA suite.

I thought it would be fun to do a naive search of CSS queries in the accessibility related
code for each browser, and create minimal codepens that demonstrate their behavior. This will probably
not be comprehensive by any means (especially since I'm not an expert in any of these codebases), but
I hope it will still be interesting to look at!

<table-of-contents></table-of-contents>

## All Browsers

### Display Properties

As previously mentioned, the [CSS display property](https://developer.mozilla.org/en-US/docs/Web/CSS/display) affects accessibility semantics. Understandably so! If something is hidden and uninteractive via a `display: hidden` declaration, it should probably be hidden from assistive technologies as well.

This behavior is explicitly called out under the [Excluding Elements from the Accessibility Tree](https://w3c.github.io/aria/#tree_exclusion) section in the ARIA specification.

- [Pen: CSS Display](https://codepen.io/sivakusayan/pen/abxQajZ)
- [Pen: CSS Display (Debug)](https://cdpn.io/pen/debug/abxQajZ)
- To Test: Inspect the accessibility tree through your browser.

<aside>Notice how the ARIA specification calls out that applying CSS <code>visibility: hidden</code> to a node should also hide it from the accessibility tree. I encourage you to test that behavior yourself.</aside>

### Pseudo-elements

Suppose that some HTML element has a pseudo-element with the CSS `content` property. Should that
text be accounted for when calculating an element's accessible name? This case is explicitly called
out in the <a href="https://w3c.github.io/accname/#comp_name_from_content">name from
content traversal step</a> of the accessible name computation algorithm. 

- [Pen: CSS Pseudo-element](https://codepen.io/sivakusayan/pen/rNbQXwX)
- [Pen: CSS Pseudo-element (Debug)](https://cdpn.io/pen/debug/rNbQXwX)
- To Test: Inspect the accessibility tree through your browser.

<aside>
<p>Did you know that you can add <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/content?">alternative text to the CSS content of pseudo-elements</a>?</p>
<p>
This currently is not accounted for in the accessible name computation algorithm (at least, not in
the specification). <a href="https://github.com/w3c/accname/issues/204">Issue w3c/accname/204</a> discusses
accounting for this in the spec.
</p>
</aside>

### Layout Table Guessing

There are lots of websites that unfortunately use the <code>table</code> HTML element for layout.
If browsers exposed all of these as real tables in the accessibility tree, navigation for screen
reader users could potentially be extremely tedious.

To solve this problem, all three major browsers have various heuristics to determine whether an HTML
<code>table</code> is a "real" table that should be exposed as a table in the accessibility tree, or
whether its table semantics should be ignored. For example, the CSS border color and background color of table cells are used in this heuristic!

- [Pen: Layout Table Border Color](https://codepen.io/sivakusayan/pen/wvYbrVR)
- [Pen: Layout Table Border Color (Debug)](https://cdpn.io/pen/debug/wvYbrVR)
- [Pen: Layout Table Background Color](https://codepen.io/sivakusayan/pen/YzJbrmY)
- [Pen: Layout Table Background Color (Debug)](https://cdpn.io/pen/debug/YzJbrmY)
- To Test: Use the screen reader of your choice, and attempt to find a table.

[Another article that I wrote](https://sayansivakumaran.com/posts/2023/6/browser-table-accessibility-remediation/) talks about this in more depth if you're curious.

### Bounding Box Calculations

This is cheating, but a requirement!

- [Pen: Bounding Box](https://codepen.io/sivakusayan/pen/zYXyGRz)
- [Pen: Bounding Box (Debug)](https://cdpn.io/pen/debug/zYXyGRz)
- To Test:
    - Use assistive technology that will display a bounding box for you
    - Use an accessibility API inspector to programatically read the size. Notice how all of the input fields have the same HTML, but the differing CSS will affect the calculated bounding box.

## Chromium

### Clearfix Hack

### Range slider writing modes

### Log for user-select: none

### List style

### Font style attributes

### Display property on AccName calculations

<a href="https://github.com/w3c/accname/issues/225">Issue w3c/accname/#225</a> brings up discussion on whether the
<code>display</code> attribute should affect how whitespace is or isn't added during the <a href="https://w3c.github.io/accname/#comp_name_from_content">name from
content traversal step</a> of the accessible name computation algorithm. This behavior is <a
href="https://chromium-review.googlesource.com/c/chromium/src/+/4921470">already implemented in Chromium</a> if you want to test it out.

- [Pen: CSS Display AccName](https://codepen.io/sivakusayan/pen/jORXxOZ)
- [Pen: CSS Display AccName (Debug)](https://cdpn.io/pen/debug/jORXxOZ)
- To Test: Inspect the accessibility tree through your browser.

## Webkit

### List style

## Gecko

### Opacity
