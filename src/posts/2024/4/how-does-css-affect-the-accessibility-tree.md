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

<aside>There is discussion about an element's display property affecting how whitespace is or isn't added when computing something's accessible name.</aside>

### Pseudo-elements

Pseudo content mainly contribute to the accessible name. Depending on the browser implementation, they may create nodes in the accessibility tree, too.

- [Pen: CSS Pseudo-element](https://codepen.io/sivakusayan/pen/rNbQXwX)
- [Pen: CSS Pseudo-element (Debug)](https://cdpn.io/pen/debug/rNbQXwX)
- To Test: Inspect the accessibility tree through your browser.

<aside>Did you know that you can give your pseudo content alternative text? There is an open issue in the accname spec to consider this when computing an element's accessible name.</aside>

### Layout Table Guessing

There is another article that talks about this in much more depth.

- [Pen: Layout Table Border Color](https://codepen.io/sivakusayan/pen/wvYbrVR)
- [Pen: Layout Table Border Color (Debug)](https://cdpn.io/pen/debug/wvYbrVR)
- [Pen: Layout Table Background Color](https://codepen.io/sivakusayan/pen/YzJbrmY)
- [Pen: Layout Table Background Color (Debug)](https://cdpn.io/pen/debug/YzJbrmY)
- To Test: Use the screen reader of your choice, and attempt to find a table.

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

## Webkit

### List style

## Gecko

### Opacity
