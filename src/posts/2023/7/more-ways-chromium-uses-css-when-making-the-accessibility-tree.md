---
title: More ways Chromium uses CSS when making the accessibility tree
description: There are more things than just display CSS properties that influence accessibility.
date: 2023-07-26
tags:
  - Accessibility
layout: layouts/post.njk
eleventyExcludeFromCollections: true
---

Most developers that have been working in accessibility for a while know that the browsers don't only generate the accessibility tree from the DOM:

- <code>display: none</code> hides content from the accessibility tree
- Layout list hueristics in Safari measure CSS
- Layout table heuristics in all browsers measure CSS
- Pseudo-element <code>content</code> is added to the accessibility tree

In Chromium, I've encountered other interesting uses of CSS that I thought would be cool to share.

The idea behind this is really simple - search for places in the accessibility code where we query CSS, read the code, and list them here. I'll write up a codepen for each of them, and you can inspect them using either the developer tools or the chrome://accessibility tool - I'll call out which you'll need for each example.

Useless? Probably. Interesting? I'd like to think so.

## Logic for clearfix hack

Clearfixes are everywhere. Guess it would be weird if screen readers were reading "blank" everywhere.
https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_object_cache_impl.cc;l=1196?q=%22ComputedStyle*%22&ss=chromium%2Fchromium%2Fsrc:third_party%2Fblink%2Frenderer%2Fmodules%2Faccessibility%2F

## CSS Alt Text

https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=795?q=%22ComputedStyle*%22&ss=chromium%2Fchromium%2Fsrc:third_party%2Fblink%2Frenderer%2Fmodules%2Faccessibility%2F

## Range slider writing modes

Super recent!

https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_slider.cc;l=52?q=%22ComputedStyle*%22&ss=chromium%2Fchromium%2Fsrc:third_party%2Fblink%2Frenderer%2Fmodules%2Faccessibility%2F

## Logic for user-select: none

https://source.chromium.org/chromium/chromium/src/+/refs/heads/main:ui/accessibility/ax_enums.mojom;l=849;drc=b5cd13bb6d5d157a5fbe3628b2dd1c1e106203c6;bpv=1;bpt=1?q=%22ComputedStyle*%22&ss=chromium%2Fchromium%2Fsrc:third_party%2Fblink%2Frenderer%2Fmodules%2Faccessibility%2F

## List style

It seems like UIA really cares about whether something is a bulleted or a numbered list.
Not entirely sure why though.

Naturally, this information is taken from the CSS list style attribute.
https://chromium-review.googlesource.com/c/chromium/src/+/1546614

## Font style attributes

https://source.chromium.org/chromium/chromium/src/+/refs/heads/main:third_party/blink/renderer/modules/accessibility/ax_object.cc;drc=a5150e1903bde84e008ac27d8881d9ccf72e087e;bpv=1;bpt=1;l=2051?q=ax_enums&ss=chromium

## Progressbar semantics

This was an older one, and isn't accurate anymore. But I still think it's interesting nevertheless.
