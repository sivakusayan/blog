---
title: Edge cases where Chromium purposefully deviates from the ARIA spec
description: There are times where browsers may not follow the ARIA spec to the letter, such as for performance reasons or for features needed by AT. We will take a look at some Chromium-specific edge cases.
date: 2023-07-12
tags:
  - Accessibility
layout: layouts/post.njk
---

Since I started doing contributions to the accessibility code in Chromium, I've learned a lot about just how complex accessibility can get, not only for web authors, but also for browsers and assistive technology. The most interesting things I have learned about is how CSS is involved in creating the accessibility tree (maybe that's a future blog post), as well as places where Chromium purposefully goes against the ARIA specifications. 
I wanted to show some edge cases that you can directly verify yourself, using the <a href="https://developer.chrome.com/docs/devtools/accessibility/reference/#pane">accessibility inspector of a Chromium-based browser</a>. I'll also do my best to explain why that code is there, as much as I can from reading commit messages and bug reports, anyway.

## <code>aria-owns</code> is not valid on all elements
This might be immediately obvious. For example, does it make sense for an input element to have children? What about a checkbox?

## <code>role="row"</code> does not always compute name from content
For performance reasons, rows do not always compute the name from their children. Instead, this is done conditionally.

## <code>role="button"</code> does not always have presentational children
To be honest, I'm not quite sure why this is needed. I think the discrepancy is interesting regardless.
Note that this is only true for Chromium on desktop. When Chromium is run for Android, buttons will still have presentational children.