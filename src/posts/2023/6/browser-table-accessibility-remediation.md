---
title: Exploring the "Is this a real or fake table?" algorithm in browsers
description: How browsers distinguish between "real" and "fake" tables for accessibility
date: 2023-06-06
tags:
  - Accessibility
  - Tables
layout: layouts/post.njk
---

There are a lot of websites out there that, unfortunately, use the <code>&lt;table&gt;</code> HTML element as a styling tool. This poses a problem to users of assistive technology, as there is now a lot of incorrect semantic information in the page. 

To mitigate this issue when creating the accessibility tree, browsers try to guess when a <code>&lt;table&gt;</code> is being used for purely styling purposes. If they guess that a <code>&lt;table&gt;</code> might not *really* be a table, that information is then hinted to assistive technology. For example, [here is a <code>&lt;table&gt;</code>](https://codepen.io/sivakusayan/full/qBQBPmJ) that no major browser will expose as a table - you can take any screen reader to the linked codepen to verify for yourself.

I thought it would be interesting to look at this guessing algorithm in more detail. We will look at some minimal codepens of <code>&lt;tables&gt;</code> that start out as purely stylistic layout tables, and then tweak them *just barely enough* to make browsers think they are real data tables. 🙂

<aside>
<details>
<summary>Definitions</summary>
<dl>
<dt id="accessibility-tree">Accessibility tree</dt>
<dd>A tree data structure that represents a graphical user interface, commonly consumed by assistive technology (although they are not the only consumers).</dd>
<dt id="assistive-technology">Assistive technology</dt>
<dd>Software or hardware that disabled people use to improve their quality of life.</dd>
<dt id="layout-table">Layout table</dt>
<dd>A table that is only used for styling, and not for showing tabular data.</dd>
<dt id="data-table">Data table</dt>
<dd>Any table that isn't a layout table.</dd>
</dl>
</details>
<details>
    <summary>How I tested</summary>
    As this article is only concerned with how browsers expose certain HTML in the accessibility APIs, here is how I get my results for each browser:

- On Windows, I will look for the <code>layout-guess</code> attribute on the <code>&lt;table's&gt;</code> IAccessible2 node using the [dump tree utility](https://chromium.googlesource.com/chromium/src/+/master/tools/accessibility/inspect/README.md). If a node has this attribute set to true, it's a layout table, otherwise it's a data table. 
- On Mac, I will look to see if the <code>&lt;table&gt;</code> is exposed as a table in the accessibility tree using the [Accessibility Inspector](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/OSXAXTestingApps.html). If it's not, it's a layout table, otherwise it's a data table.
- On Linux, I will look to see if the <code>&lt;table&gt;</code> is exposed as a table in the accessibility tree using the [dump tree utility](https://chromium.googlesource.com/chromium/src/+/master/tools/accessibility/inspect/README.md). If it's not, it's a layout table, otherwise it's a data table.

At the time of this writing, I am testing with versions:
- Chrome Version 114.0.5735.90
- Edge Version 114.0.1823.37
- Firefox Version 113.0.2
- Safari Version 16.4 (18615.1.26.11.23)

Finally, for simplicity's sake, I will not list browser + platform combinations as each individual browser's results don't seem to change with the platform. I will just list the results of each browser, and you can assume those results are true for each platform the browser is available on.

If you don't want to verify these results in the above way, here are some shortcuts you can use, which aren't as rigorous, but can give you a basic way of verifying what I'm saying:
- On Chrome and Edge, you can use the [Accessibility Inspector](https://developer.chrome.com/docs/devtools/accessibility/reference/#pane) in the developer tools. Layout tables will be explicitly called out as layout tables here.
- On Firefox, you can use:
    - NVDA on Windows and use [NVDA table shortcuts](https://dequeuniversity.com/screenreaders/nvda-keyboard-shortcuts#nvda-tables) to see if it detects a table.
    - Voiceover on Mac and use [Voiceover table shortcuts](https://dequeuniversity.com/screenreaders/voiceover-keyboard-shortcuts#vo-mac-tables) to see if it detects a table.
    - Orca on Linux and use [Orca table shortcuts](https://help.gnome.org/users/orca/stable/commands_structural_navigation.html.en#tables) to see if it detects a table.
- On Safari, you can use Voiceover and use [Voiceover table shortcuts](https://dequeuniversity.com/screenreaders/voiceover-keyboard-shortcuts#vo-mac-tables) to see if it detects a table.
</details>
<details>
<summary>A note if you want to experiment</summary>
<p>If you plan on modifying the codepens to experiment, you should use the CodePen editor directly instead of modifying the HTML through the developer tools. </p>

<p>
I'm seeing that browsers don't necessarily update the guess of whether a table is a layout table or a data table if the table is modified after being rendered, so edits through the developer tools won't work. Edits in the codepen work as they refresh the embedded <code>&lt;iframe&gt;</code>.</p>
</details>
</aside>

## Heuristics
### Determining table-ness via HTML
All major browsers will attempt to search for certain table-specific semantic elements. If it finds any, it will abort the algorithm early and just declare the table to be a data table. Browsers seem to agree that tables with a <code>&lt;caption&gt;</code>, <code>&lt;thead&gt;</code>, or <code>&lt;tfoot&gt;</code> are all data tables.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="result" data-slug-hash="LYgozwL" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/LYgozwL">
  Determining table-ness via the number of rows </a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the number of rows
All major browsers will attempt to count the number of rows that a table has, and if it has sufficiently many it will be declared a data table. Chrome, Edge, Firefox, and Safari all agree that a table with at least 20 rows is a data table.

As soon as we make the table have 19 rows, however, every browser except Firefox considers the table a layout table.

<aside>
<details>
    <summary>Thoughts on Firefox behavior</summary>
    <p>
    I was a little bit confused at first on why Firefox thought the extremely minimal table with 19 rows was a data table. Especially since Firefox seems to do a similar row count check that other browsers use, from reading the code. 
    </p>
    <p>
    My immediate guess as to why (without examining with a debugger) is that Firefox seems to assume every table is a data table until proven otherwise, while other browsers assume that a table is a layout table until proven otherwise. Again, this is just speculation from reading the code, and I would need to use a debugger to verify my hypothesis.
    </p>
</details>
</aside>

<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="result" data-slug-hash="KKGLXjj" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/KKGLXjj">
  Determining table-ness via the CSS background-color of table rows</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>background-color</code> of table rows
The incorporation of CSS in this guessing algorithm is very interesting to me. 

All four browsers seem to agree that a table with alternating <code>background-colors</code> on its rows is a data table, as long as the table has more than two rows. Firefox is the only browser that does not enforce a minimum of three rows when checking that the rows have alternating backgrounds.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="result" data-slug-hash="jOeoGoo" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/jOeoGoo">
  Determining table-ness via the CSS background-color of table rows</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>background-color</code> of table cells
Chrome, Edge, and Safari all check the <code>background-color</code> of the table cells and sees if it is different from the <code>background-color</code> defined on the table. If this is true for at least half of the cells in the table, then it becomes a data table. However, note that the <code>background-color</code> has to be explicitly defined on the <code>&lt;td&gt;</code> - defining the <code>background-color</code> on the <code>&lt;tr&gt;</code> won't work. 

Firefox does not seem to employ this heuristic at all.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="result" data-slug-hash="YzJbrmY" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
  <span>See the Pen <a href="https://codepen.io/sivakusayan/pen/YzJbrmY">
  Determining table-ness via the CSS background-color of table cells</a> by Sayan Sivakumaran (<a href="https://codepen.io/sivakusayan">@sivakusayan</a>)
  on <a href="https://codepen.io">CodePen</a>.</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>

### Determining table-ness via the CSS <code>border</code> of table cells
All major browsers do checks on the border of table cells to help determine whether something is a data table or not.

 Chrome, Edge, and Safari check to see if *any* side of the table cell has a border. If this is true for at least half the cells in the table, those browsers expose the table as a data table. 
 
 Firefox does it slightly differently - it only checks the first table cell, and checks if it has a border on *all* sides. If so, Firefox exposes the table as a data table.
<p class="codepen" data-height="300" data-theme-id="dark" data-default-tab="result" data-slug-hash="wvYbrVR" data-editable="true" data-user="sivakusayan" style="height: 300px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; border: 2px solid; margin: 1em 0; padding: 1em;">
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

<aside>
<details>
<summary>If you can't access Chromium code search</summary>
I've been told by a screen reader user that the Chromium code search isn't accessible. I'm really sorry if you are also running into issues 🙁. While not ideal, I hope this <a href="/posts/resources/chromiumTableLayoutGuess.txt">raw text version of the code</a> can be a temporary workaround.
</details>
</aside>

As for the other browsers, I'm not exactly sure where the logic is since I haven't debugged those browsers and am not as familiar with their codebases, but I can give a fairly likely guess from reading the code:
- <a href="https://searchfox.org/mozilla-central/rev/0c2945ad4769e2d4428c72e6ddd78d60eb920394/accessible/generic/TableAccessible.cpp#19">Probably Firefox's layout table guess</a>
- <a href="https://github.com/WebKit/WebKit/blob/023f54b8e5b80830c6d4eee7f54143aa4d15b9b9/Source/WebCore/accessibility/AccessibilityTable.cpp#L114">Probably Safari's layout table guess</a>

There is some logic I didn't cover - for example, Firefox seems to do checks on how wide the <code>&lt;table&gt;</code> is relative to the entire page. I encourage you to read the code if you want to learn more!