---
title: Edge cases where Chromium purposefully deviates from the ARIA spec
description: There are times where browsers may not follow the ARIA spec to the letter, such as for performance reasons or for features needed by AT. We will take a look at some Chromium-specific edge cases.
date: 2023-07-12
tags:
  - Accessibility
layout: layouts/post.njk
---

Something that has always been interesting to me are edge cases where Chromium intentionally ignores specific guidance in the ARIA specifications, whether it be for performance reasons or otherwise.

I've crafted some minimal codepens that show these edge cases in effect - you can then verify Chromium's behavior yourself, using the <a href="https://developer.chrome.com/docs/devtools/accessibility/reference/#pane">accessibility inspector of a Chromium-based browser</a>. I'll also give my interpretation of why that code is there, from what I can gather from commit messages and discussions in bug reports.

<details>
<summary>Notes on how I tested</summary>

This post is more a tour on interesting pieces of Chromium code, rather than any sort of statement on what is or isn't supported.

Therefore, I am not testing with any assistive technology, and am just checking what Chromium tells me through the accessibility inspector. That being said, the accessibility inspector still more or less shows what is exposed through the accessibility APIs (although it certainly doesn't show everything that is being exposed).

Finally, the ARIA specification I am referring to is the latest draft of the ARIA 1.3 specification, last drafted on July 5th, 2023.
</details>

## <code>aria-owns</code> is not valid on all elements
The <a href="https://w3c.github.io/aria/#aria-owns"><code>aria-owns</code> entry in the ARIA specification</a> mentions that aria-owns has a "Used in roles" value of "All elements of the base markup".
This might be immediately obvious. For example, does it make sense for an input element to have children? What about a checkbox?

<a href="https://codepen.io/sivakusayan/pen/MWzQEdP"><b>Codepen: </b><code>aria-owns</code> not respected on all base markup</a>

<a href="https://github.com/chromium/chromium/blob/02e65feb53029473f796c1bc2bbbf214ea627688/third_party/blink/renderer/modules/accessibility/ax_relation_cache.cc#L151"><b>Chromium source code: </b><code>aria-owns</code> filtering</a>

## <code>role="row"</code> does not always compute name from content
The <a href="https://w3c.github.io/aria/#row"><code>row</code> entry in the ARIA specification</a> mentions that elements with a role of <code>row</code> (implicit or otherwise) supports name from contents.
In other words, user agents should use the row's children to try and compute an accessible name for the row.
For performance reasons, rows do not always compute the name from their children. Instead, this is done conditionally.

This behavior is the cause behind this bug. The way to fix this is to probably account for <code>aria-controls</code> as well.

<a href="https://codepen.io/sivakusayan/pen/qBQxVBE"><b>Codepen: </b>Elements with <code>role="row"</code> conditionally compute name from contents</a>

<a href="https://github.com/chromium/chromium/blob/02e65feb53029473f796c1bc2bbbf214ea627688/third_party/blink/renderer/modules/accessibility/ax_object.cc#L6933"><b>Chromium source code: </b>conditional name from contents</a>

## <code>role="button"</code> does not always have presentational children
The <a href="https://w3c.github.io/aria/#button"><code>button</code> entry in the ARIA specification</a> mentions that buttons have presentational children.
To be honest, I'm not quite sure why this is needed. I think the discrepancy is interesting regardless.
Note that this is only true for Chromium on desktop. When Chromium is run for Android, buttons will still have presentational children.

<a href="https://codepen.io/sivakusayan/pen/dyQdZyG"><b>Codepen: </b>Elements with <code>role="button"</code> conditionally make children presentational</a>

<a href="https://github.com/chromium/chromium/blob/02e65feb53029473f796c1bc2bbbf214ea627688/content/browser/accessibility/browser_accessibility.cc#L984"><b>Chromium source code: </b>presentational children on Desktop</a>

<a href="https://github.com/chromium/chromium/blob/02e65feb53029473f796c1bc2bbbf214ea627688/content/browser/accessibility/browser_accessibility_android.cc#L534"><b>Chromium source code: </b>presentational children on Android</a>