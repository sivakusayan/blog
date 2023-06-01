---
title: When <tables> aren't tables in the accessibility tree
description: How browsers distinguish between "real" and "fake" tables for accessibility
date: 2023-05-29
tags:
  - Accessibility
  - Tables
layout: layouts/post.njk
---

There is unfortunately a lot of old HTML code out there that uses the <code>&lt;table&gt;</code> HTML tag to style their websites. This poses a problem to users of assistive technology, especially screen readers, as there is now a lot of incorrect semantic information in the page. To bypass this, browsers have some special heuristics to determine when a <code>&lt;table&gt;</code> should be exposed as a table in the accessibility tree, and when it should just be exposed as a *layout* table (which commonly maps to a generic node).

## Heuristics
### Determining table-ness via the presence HTML elements
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="LYgozwL" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/LYgozwL">
  Determining table-ness via the number of rows </a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the number of rows
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="KKGLXjj" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/KKGLXjj">
  Determining table-ness via the CSS background-color of table rows</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>background-color</code> of table rows
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="jOeoGoo" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/jOeoGoo">
  Determining table-ness via the CSS background-color of table rows</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>background-color</code> of table cells
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="YzJbrmY" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/YzJbrmY">
  Determining table-ness via the presence of HTML elements</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>border</code> of table cells
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="wvYbrVR" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/wvYbrVR">
  Determining table-ness via the CSS background-color of table cells</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

## Source code
- <a href="https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_layout_object.cc;drc=99f969b129a7123125ac7af40afb24277dd4767a;l=1043">Chromium</a>
- <a href="https://searchfox.org/mozilla-central/rev/0c2945ad4769e2d4428c72e6ddd78d60eb920394/accessible/generic/TableAccessible.cpp#19">Firefox</a>
- <a href="https://github.com/WebKit/WebKit/blob/023f54b8e5b80830c6d4eee7f54143aa4d15b9b9/Source/WebCore/accessibility/AccessibilityTable.cpp#L114">Safari</a>