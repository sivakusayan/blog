---
title: Exploring the "Is this a real or fake table?" algorithm in browsers
description: How browsers distinguish between "real" and "fake" tables for accessibility
date: 2023-05-29
tags:
  - Accessibility
  - Tables
layout: layouts/post.njk
---

There are a lot of websites out there that, unfortunately, use the <code>&lt;table&gt;</code> HTML element as a styling tool. This poses a problem to users of assistive technology, as there is now a lot of incorrect semantic information in the page. 

To mitigate this issue when creating the accessibility tree, browsers try to guess when a <code>&lt;table&gt;</code> is being used for purely styling purposes, and then hints at that information to assistive technology.

I thought it would be interesting to look at this guessing algorithm in more detail. We will look at some minimal codepens of <code>&lt;tables&gt;</code> that start out as layout tables, and then tweak them *just barely enough* to make browsers think they are data tables. 🙂

<details>
    <summary>A note on testing</summary>
    As this article is only concerned with how browsers expose this HTML in the accessibility APIs, here is how I get my results for each browser:

- On Windows, I will look for the <code>layout-guess</code> attribute on the <code>&lt;table&gt;</code>'s IAccessible2 node using the dump tree utility. If a node has this attribute set to true, it's a layout table, otherwise it's a data table. 
- On Mac, I will look to see if the <code>&lt;table&gt;</code> is exposed as a table in the accessibility tree using the Accessibility Inspector. If it's not, it's a layout table, otherwise it's a data table.
- On Linux, I will look to see if the <code>&lt;table&gt;</code> is exposed as a table in the accessibility tree using the dump tree utility. If it's not, it's a layout table, otherwise it's a data table.

At the time of this writing, I am testing with versions:
- Chrome Version 114.0.5735.90
- Edge Version 114.0.1823.37
- Firefox Version 113.0.2
- Safari Version 16.4 (18615.1.26.11.23)

Finally, for simplicity's sake, I will not list browser + platform combinations as each individual browser's results don't seem to change with the platform. I will just list the results of each browser, and you can assume those results are true for each platform the browser is available on.

If you don't want to verify these results in the above way, here are some shortcuts you can use, which aren't as rigorous, but can give you a basic way of verifying what I'm saying:
- On Chrome, you can use the Accessibility Inspector in the developer tools.
- On Edge, you can use the Accessibility Inspector in the developer tools.
- On Firefox, you can use:
    - NVDA on Windows and use NVDA table shortcuts to see if it detects a table.
    - Voiceover on Mac and use Voiceover table shortcuts to see if it detects a table.
    - Orca on Linux and use Orca table shortcuts to see if it detects a table.
- On Safari, you can use Voiceover and use Voiceover table shortcuts to see if it detects a table.
</details>

## Heuristics
### Determining table-ness via HTML
Browsers will attempt to search for relevant semantic HTML in the table element.
If it finds any, it will abort the algorithm early and just declare the table to be a data table.
In all four major browsers, there seems to be agreement that tables with captions, table headers, or table footers are all data tables.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="LYgozwL" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/LYgozwL">
  Determining table-ness via the number of rows </a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the number of rows
Browsers will attempt to count the number of rows that a table has, and if it has sufficiently many it will be declared a data table. Chrome, Edge, and Safari all agree that a table with at least 20 rows is a data table, and any less than that is a layout table. Firefox still seems to consider the table with 19 rows a data table, although I wasn't immediately sure why from reading the code. The breakpoint for Firefox to consider a table "long enough" to be a data table seems to be 6 rows - any lower than that and it becomes a layout table.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="KKGLXjj" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/KKGLXjj">
  Determining table-ness via the CSS background-color of table rows</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>background-color</code> of table rows
The incorporation of CSS in this guessing algorithm is very interesting to me. All four browsers seem to agree that a table with striped rows is a data table, as long as the table has more than two rows. Firefox is the only browser that only checks for striped rows, and does not enforce a minimum amount of striped rows.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="jOeoGoo" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/jOeoGoo">
  Determining table-ness via the CSS background-color of table rows</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>background-color</code> of table cells
Chrome, Edge, and Safari all check the background-color of the table cells and sees if it is different from the background-color defined on the table. If this is true for at least half of the cells in the table, then it becomes a data table. However, note that the background-color has to be defined on the table cell - defining the background-color on the row won't work. Firefox does not seem to employ this heuristic at all.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="YzJbrmY" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/YzJbrmY">
  Determining table-ness via the CSS background-color of table cells</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>border</code> of table cells
All four browsers do checks on the border of table cells. Chrome, Edge, and Safari check to see if some side of the table cell has a border, and if this is true for at least half the cells in the table. If so, we have a data table. Firefox does it slightly differently - it checks the first table cell, and makes sure it has a border on all sides of the cell. If so, we have a data table.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="html,result" data-slug-hash="wvYbrVR" data-preview="true" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/wvYbrVR">
  Determining table-ness via the CSS background-color of table cells</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

## Source code
Reading the source code for this algorithm was really helpful in constructing these minimal codepens.

If you're curious, here is where you can walk through the algorithm's logic yourself in Chromium.
Note how you can opt out of this entire guessing logic by just manually setting <code>role="table"</code> on the element. (Of course, <a href="https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA">don't use ARIA unless you need to</a>)
- <a href="https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_layout_object.cc;drc=99f969b129a7123125ac7af40afb24277dd4767a;l=1043">Chromium's layout table guess</a>

As for the other browsers, I'm not exactly sure where the logic is since I haven't debugged those browsers and am not as familiar with their codebases, but I can give a fairly likely guess from reading the code:
- <a href="https://searchfox.org/mozilla-central/rev/0c2945ad4769e2d4428c72e6ddd78d60eb920394/accessible/generic/TableAccessible.cpp#19">Probably Firefox's layout table guess</a>
- <a href="https://github.com/WebKit/WebKit/blob/023f54b8e5b80830c6d4eee7f54143aa4d15b9b9/Source/WebCore/accessibility/AccessibilityTable.cpp#L114">Probably Safari's layout table guess</a>

There is some logic I did not cover in this post, so feel free to read through the code yourself if you're curious!

<aside>
<dl>
<lh>Definitions</lh>
<dt>Accessibility tree</dt>
<dd>A tree data structure that represents a graphical user interface, commonly consumed by assistive technology (although they are not the only consumers).</dd>
<dt>Assistive technology</dt>
<dd>Software or hardware that disabled people use to improve their quality of life.</dd>
<dt>Layout table</dt>
<dd>A table that is only used for styling, and not for showing tabular data.</dd>
<dt>Data table</dt>
<dd>Any table that isn't a layout table.</dd>
</dl>
</aside>