---
title: How does CSS affect the accessibility tree?
description: HTML isn't the only thing that can affect the output of the accessibility tree. CSS can change the accessibility tree too - some ways are in the specifications themselves, while others are implementation dependent.
date: 2024-04-26
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

## How to read this post

This post is comprised of several different examples of how CSS can affect the accessibility tree.
Each example will have the following:

- For behavior that is not standardized, I will link to the relevant browser source code that causes
  the observed behavior. The linked code is current as of the day of writing.
- I will link a CodePen that demonstrates the behavior so you can try it out in your own browser. I
  link both:
  - the debug version if you want to inspect the accessibility tree without the
    complexity of the CodePen wrapper
  - the regular version if you want to edit/play with the code.
- I will call out how you can actually go about testing the CodePen above. The instructions will generally
  be of two forms:
  - [Inspect the browser's accessibility tree](/posts/2024/4/how-to-inspect-the-accessibility-tree/#inspecting-the-accessibility-tree-through-the-developer-tools)
  - [Inspect the platform specific accessibility tree (for platform specific behavior)](/posts/2024/4/how-to-inspect-the-accessibility-tree/#inspecting-the-platform-accessibility-tree)

Finally, I want to emphasize that we will only focus on how CSS affects the generated accessibility tree, not
how different assistive technologies interact with each example (as that would make this post unbearably complex and long).

## All Browsers

### Display Properties

As previously mentioned, the [CSS display property](https://developer.mozilla.org/en-US/docs/Web/CSS/display) affects accessibility semantics. Understandably so! If something is hidden and uninteractive via a `display: hidden` declaration, it should probably be hidden from assistive technologies as well.

This behavior is explicitly called out under the [Excluding Elements from the Accessibility Tree](https://w3c.github.io/aria/#tree_exclusion) section in the ARIA specification.

- [Pen: CSS Display](https://codepen.io/sivakusayan/pen/abxQajZ)
- [Pen: CSS Display (Debug)](https://cdpn.io/pen/debug/abxQajZ)
- **To Test:** Inspect the accessibility tree through your browser.

<aside>Notice how the ARIA specification calls out that applying CSS <code>visibility: hidden</code> to a node should also hide it from the accessibility tree. I encourage you to test that behavior yourself.</aside>

### Conditional Whitespace in Accessible Name from Display Properties

- [Conditional Whitespace from Display - Chromium Source Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=4704;drc=fa67bc861debe561f482e5023096ced07cf33f45)
- [Conditional Whitespace from Display - Webkit Source Code](https://github.com/WebKit/WebKit/blob/9f05a02fc85a42c92ade9dcb132d636872e54826/Source/WebCore/accessibility/AccessibilityNodeObject.cpp#L2268)
- [Conditional Whitespace from Display - Gecko Source Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/base/nsTextEquivUtils.cpp#152)

The CSS display property doesn't just control whether a node is included in the accessibility tree or not - all three browser implementations use it to control whether whitespace is added around a child element when computing the accessible name of a node.
<a href="https://github.com/w3c/accname/issues/225">Issue w3c/accname/#225</a> brings this topic up - maybe this will eventually
be part of the standard!

- [Pen: CSS Display AccName](https://codepen.io/sivakusayan/pen/jORXxOZ)
- [Pen: CSS Display AccName (Debug)](https://cdpn.io/pen/debug/jORXxOZ)
- To Test: Inspect the accessibility tree through your browser.

### Pseudo-element contribution to Accessible Name

Suppose that some HTML element has a pseudo-element with the CSS `content` property. Should that
text be accounted for when calculating an element's accessible name? This case is explicitly called
out in the <a href="https://w3c.github.io/accname/#comp_name_from_content">name from
content traversal step</a> of the accessible name computation algorithm.

- [Pen: CSS Pseudo-element](https://codepen.io/sivakusayan/pen/rNbQXwX)
- [Pen: CSS Pseudo-element (Debug)](https://cdpn.io/pen/debug/rNbQXwX)
- **To Test:** Inspect the accessibility tree through your browser.

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
- **To Test:** Use the screen reader of your choice, and attempt to find a table.

[Another article that I wrote](/posts/2023/6/browser-table-accessibility-remediation/) talks about this in more depth if you're curious.

### Bounding Box Calculations

This is cheating, but a requirement!

- [Pen: Bounding Box](https://codepen.io/sivakusayan/pen/zYXyGRz)
- [Pen: Bounding Box (Debug)](https://cdpn.io/pen/debug/zYXyGRz)
- **To Test:**
  - Use assistive technology that will display a bounding box for you
  - Use an accessibility API inspector to programatically read the size. Notice how all of the input fields have the same HTML, but the differing CSS will affect the calculated bounding box.

## Chromium (Chrome, Edge, etc.)

### Display Style

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_object.cc;l=1814;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)
[Windows and Linux Code](https://source.chromium.org/chromium/chromium/src/+/main:ui/accessibility/platform/ax_platform_node_base.cc;l=1232;drc=fa67bc861debe561f482e5023096ced07cf33f45)
[Android Code](https://chromium-review.googlesource.com/c/chromium/src/+/3818741)
[NVDA Code](https://github.com/nvaccess/nvda/pull/11606)
[Orca Code](https://gitlab.gnome.org/GNOME/orca/-/blob/90652ed04da4317a814197b1aefc4dd0242ebcc4/src/orca/scripts/web/script_utilities.py#L1440)

### Display Contents Style

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/core/dom/element.cc;l=7477;drc=98cde8514f5173135ba3d52b140553c7b26b4497)

### Ignoring text from the clearfix hack

[Ignoring text from the clearfix hack - Source Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_object_cache_impl.cc;l=1217;drc=ef77a2d141758db43ceb4d87723e9451cb1519e0)

The clearfix hack was apparently some kind of CSS trick to make it easier to create web layouts
before flexbox and grid support were implemented in browsers. Regardless of what it is, it seems to
be common enough on the web to cause really annoying interactions for screen reader users, judging from the commit
message:

<blockquote>
<p>
Commit e85e514 : aleventhal@chromium.org @ 2021-09-23 10:42 AM

Omit extra blank line announcements from micro clearfix hacks

The "Micro Clearfix Hack" is an old CSS hack used to contain floats
without using additional HTML elements. However, this currently results
in extra "blank" announcements on many pages, in some screen readers.

</p>
</blockquote>

Because of this, it seems Chromium controls whether whitespace pseudo-elements emit
accessibility nodes by looking at its CSS `display` property. In particular, if the pseudo-element
has an `inline` display, Chromium will generate a whitespace text node for it in the accessibility
tree. Otherwise, the browser will ignore it.

- [Pen: Clearfix Hack](https://codepen.io/sivakusayan/pen/dyLaXNQ)
- [Pen: Clearfix Hack (Debug)](https://cdpn.io/pen/debug/dyLaXNQ)
- **To Test:** Inspect the accessibility tree, and notice that the whitespace pseudo-elements without the `display:
table` property have their whitespace in the accessibility tree, while the whitespace
  pseudo-elements with `display: table` are ignored.

### Pseudo-element live region events

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_pCarty/blink/renderer/modules/accessibility/ax_object_cache_impl.cc;l=2279;drc=ef77a2d141758db43ceb4d87723e9451cb1519e0)

### Input Slider Orientation

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_slider.cc;l=47;drc=2d719a4d43ab57c769159477b5a6643bd6a51cda)

- [Pen: Slider Input Orientation](https://codepen.io/sivakusayan/pen/GRLeXVW)
- [Pen: Slider Input Orientation (Debug)](https://cdpn.io/pen/debug/GRLeXVW)
- **To Test:** Inspect the platform accessibility tree. You can also use Orca or Voiceover.

### Positioned elements inclusion

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=1097;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Log for user-select: none

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=2752;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Is line breaking object

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=2448;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Is offscreen?

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=2553;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### List style

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_object.cc;l=2106;drc=98cde8514f5173135ba3d52b140553c7b26b4497)
[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3127;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Text alternative list marker conditional

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=1040;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Text Direction

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3400;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Text Position

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3449;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Text Align

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3535;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Text Indent

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3559;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Font style attributes

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3480;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)
[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3705;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)
[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3736;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)
[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3752;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Background Color

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3673;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

### Text Color?

[Code](https://source.chromium.org/chromium/chromium/src/+/main:third_party/blink/renderer/modules/accessibility/ax_node_object.cc;l=3693;drc=65359e080b28913bf209b4cd8ae24d351b4d9107)

## Webkit (Safari)

### List style

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/AccessibilityList.cpp#L167)

### Input Slider Orientation

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/AccessibilitySlider.cpp#L65)

- [Pen: Slider Input Orientation](https://codepen.io/sivakusayan/pen/GRLeXVW)
- [Pen: Slider Input Orientation (Debug)](https://cdpn.io/pen/debug/GRLeXVW)
- **To Test:** Inspect the platform accessibility tree. You can also use Orca or Voiceover.

### Font Attributes

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/ios/AccessibilityObjectIOS.mm#L217)

### Opacity

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/AXObjectCache.cpp#L442)

### Link styles

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/AccessibilityObject.cpp#L1903)

### Searching by Element Type

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/AccessibilityRenderObject.cpp#L2602)

### Apple Pay Button

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/AccessibilityRenderObject.cpp#L2622)

### AT-SPI Text Direction

[Code](https://github.com/WebKit/WebKit/blob/8b7b1a1b94a005149bbc517244ae80bbc87029b9/Source/WebCore/accessibility/atspi/AccessibilityObjectTextAtspi.cpp#L270)

## Gecko (Firefox)

Note that I will ignore anything involving `ISimpleDOMNode`, especially as that hasn't been used in
a long time from what I can tell. In practice, this means ignoring all `sdnAccessible*` files.

### Control flow of focus on hidden elements

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/base/FocusManager.cpp#423)

### Font Attributes

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/base/TextAttrs.cpp)

### Something something text

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/base/TextLeafRange.cpp)

### Must be generic accessible

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/base/nsAccessibilityService.cpp#149)

### Something something accessible creation

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/base/nsAccessibilityService.cpp#591)

### Display property on AccName calculations

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/base/nsTextEquivUtils.cpp#152)

### Something something AX tree traversal

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/generic/LocalAccessible.cpp#579)

### Exposing margin attributes

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/generic/LocalAccessible.cpp#1243)

### Something something char bounding boxes

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/generic/LocalAccessible.cpp#3703)

### Opacity

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/generic/LocalAccessible.cpp#4256)

### Bounds calculation

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/html/HTMLListAccessible.cpp#50)

### Background and Foreground

[Code](https://searchfox.org/mozilla-central/rev/6121b33709dd80979a6806ff59096a561e348ae8/accessible/windows/ia2/ia2AccessibleComponent.cpp#78)

## Wrapup
