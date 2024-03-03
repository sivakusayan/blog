---
title: What exactly is the accessibility API?
description: Sharing what I learned about the accessibility API and how it's consumed by both assistive and non-assistive technology.
date: 2023-08-24
tags:
  - Accessibility
layout: layouts/post.njk
---

<aside>
This blog post duplicates my talk "What exactly is the accessibility API?" at <a href="https://www.devfestwi.com/">Devfest Wisconsin</a>, except with technical detail and comments that I opted to leave out of the presentation. Here are <a href="https://docs.google.com/presentation/d/1D0OptHHrdh4meLcprjnFMERFrN_wc12t7Y9A-GNmW3A/edit#slide=id.p">the slides</a> if you really want them, though.
</aside>

I notice that a lot of content introducing the accessibility API ([Application Programming Interface](https://en.wikipedia.org/wiki/API)) only talk about how it might be used by screen readers. I'm guessing this is one of the reasons that people don't ever consider voice control or other assistive technologies when doing accessibility testing, and why people add questionable labels to certain controls.

I wrote this blog post to try and give an introduction to the accessibility API that doesn't only consider screen readers, and introduces what kinds of things a browser considers when generating an accessibility tree for the accessibility API. I hope I can share what I learned over the past year of doing open source work and digging into native accessibility code.

<details>
<summary>Table of Contents</summary>
<div class="details-content">
<table-of-contents />
</div>
</details>

## Foreword

All the content in this blog post will assume the basics of HTML and CSS. I will link to C++ or Python source code that you can explore if you like, but it is by no means required to understand this topic at a high level.

While any browser source code I link to will be biased to Chromium, any browser behavior I mention below should be true for the following major browsers, unless explicitly mentioned otherwise:

- Chromium (Version 116)
- Firefox (Version 116)
- Safari (Version 16.6)

Finally, all links to source code, whether it be to browsers or assistive technology or otherwise, will be locked to a specific revision — their latest revision as of the time of this writing. I do this so future readers won't experience the phenomena where I'm pointing to a line of code and that specific line of code doesn't do what I point out anymore.

## What is assistive technology?

Before introducing the concept of an accessibility API, it's important to think about what kind of technology we're trying to support.

Assistive technology is any piece of technology that disabled people use to improve their quality of life. This can include things like:

- Wheelchairs
- Refreshable braille displays
- Magnification software
- Screen readers
- Voice recognition software

For the purpose of this post, let's focus on the last two bullet points in more detail.

### What is a screen reader?

Wikipedia gives a decent summary:

<blockquote>
<p>A screen reader is a form of assistive technology (AT) that renders text and image content as speech or braille output. Screen readers are essential to people who are blind, and are useful to people who are visually impaired, illiterate, or have a learning disability.</p>
</blockquote>
<p>
- <a href="https://en.wikipedia.org/wiki/Screen_reader">Wikipedia's Screen Reader Article</a>

There are different popular screen readers depending on the platform you are on.

- JAWS and NVDA on Windows
- VoiceOver on Mac and iOS
- Orca on Linux
- Talkback on Android
- ChromeVox on ChromeOS

Regardless of platform, however, screen readers are able to do things like:

- Announce what control is currently focused
- Announce any relevant state information of the control (Is it checked? Is it expanded?)

along with any other visually important information that a screen reader user should know.

<aside>
For the sake of brevity, I will often mention that screen readers "announce" something, but as previously mentioned screen readers are just machines that generate text from a user interface. They can also be hooked up to refreshable braille displays to provide braille output, instead of just announcing something.
</aside>

Screen readers are highly customizable. For example, screen reader users can control how fast or slow text is announced, or filter out specific bits of information they might not care about.

[Demo of NVDA by Deque Systems](https://youtu.be/y0m7VEHoXMI?t=360)

### What is voice recognition software?

Voice recognition software is a form of assistive technology that allows a user to interact with their machine through voice commands. For example, if there is a link called "See my projects", such as the dummy link below:

<a href="javascript:void(0);">See my projects</a>

a voice recognition user should be able to say something like "Click see my projects", and the software will programmatically click the link. The user can also do things such as dictate text to type into some editable text area, and the voice recognition software will automatically enter that text for the user.

Some examples of voice recognition software:

- Windows Speech Recognition and Dragon Speech Recognition on Windows
- Voice Control on Mac and iOS
- Voice Access on Android

<a href="https://www.youtube.com/watch?v=7y85YDMRpTU&ab_channel=NuanceCommunications%2CInc.">Demo of Dragon by Nuance Communications</a>

### What information does assistive technology need to gather?

Suppose that we are developers for screen readers or voice recognition software. What kind of information would we need from any application that wants to support us?

Screen readers would need a way to do the following for any application:

- Programmatically access all user interface (UI) elements.
- Query for the name of a UI element: if focused, what should I announce?
- Query for what kind of UI element something is: Is it a button? Is it a link?
- Query for any state of those UI elements: Is it checked? Is it pressed?
- Programmatically ask the application to activate an element that might not be currently focused: for instance, to programmatically activate a control under a <a href="https://support.freedomscientific.com/teachers/lessons/4.2.3_VirtualPCCursor.htm">virtual cursor</a>.

Voice recognition software would need a way to do the following for any application:

- Programmatically access all interactive UI elements of an application.
- Query for the name of a UI element: is my user trying to activate this element?
- Programmatically ask the application to activate an element for us: for instance, if the user commands us to activate a button that isn't currently focused.
- Programmatically insert text somewhere in the application if the user starts dictating.

These are very similar asks. We are asking for an API that lets us programmatically read and interact with an application, and that is precisely what an accessibility API is.

## What is the accessibility API?

As mentioned above, an accessibility API allows for a consumer to do two main things:

- Programmatically determine what is in the UI
- Programmatically interact with the UI

In the accessibility API, the UI of an application is exposed as something called the **accessibility tree**, with each node in the tree being some individual unit in the UI. Depending on the UI element a node represents, a consumer can query for the state of a node, or ask to programmatically take some kind of action on a node.

Depending on the operating system, the accessibility API can have different implementation details, but the general idea remains the same. The average web developer does not have to concern themselves with this.

### What does an accessibility tree look like?

An accessibility tree is a normal tree data structure that you might explore in your computer science class. For example, in the context of the browser, suppose we have some HTML like the following:

```
<header> ... </header>
<main>
  <h1>Hello World</h1>
  <img src="..." alt="...">
  <p>
    This is a paragraph.
    <span>
      This is more text.
    </span>
  </p>
</main>
<footer> ... </footer>
```

The browser might generate an accessibility tree similar to the following for this HTML:

<ul class="tree">
  <li>
    <span>
    root
    </span>
    <ul>
      <li><span>header</span></li>
      <li>
        <span>main</span>
      <ul>
        <li><span>heading</span></li>
        <li><span>image</span></li>
        <li><span>paragraph</span></li>
      </ul>
      </li>
      <li><span>footer</span></li>
    </ul>
  </li>
</ul>

Each of these nodes may have a plethora of accessibility-related information, but we can get to that later. Notice that the accessibility tree also isn't necessarily one-to-one with the DOM tree generated from the HTML. For example, it might not be justified to give that `<span>` element its own accessibility node, and so it's just absorbed into the parent `paragraph` node instead.

From the above example, let's zoom in to the image node specifically. What kind of information might it have?

<div class="ax-node">
<p>image</p>
<dl>
<dt>Name</dt>
<dd>"Some alt text"</dd>
<dt>Role</dt>
<dd>Image</dd>
</dl>
</div>

- **Name**: The node will need an accessible name if the image is not decorative. This can let screen readers know what to read when encountering this image.
- **Role**: The node will need to have some kind of attribute marking what type of UI element it is. This lets assistive technologies know what kinds of actions they can take on this node, as well as what kind of information they can query on it. In this case, the node should be an image node.

If we instead take something stateful, like a checkbox:

```
<label for="check">Stay logged in</label>
<input
  type="checkbox"
  id="check"
  <!-- Any other relevant attributes... -->
/>
```

The accessibility node for the checkbox might look something like this:

<div class="ax-node">
<p>checkbox</p>
<dl>
<dt>Name</dt>
<dd>"Stay logged in"</dd>
<dt>Role</dt>
<dd>Checkbox</dd>
<dt>State</dt>
<dd>IsChecked: true</dd>
</dl>
</div>

- **Name**: Once again, the name lets the screen reader know what to announce when the checkbox is focused, and lets voice recognition software know what to click when the user says this checkbox's name.
- **Role**: Because of the role, assistive technology knows that it can query for the "checked" state of this node. It also knows that it can ask the browser to programmatically click the checkbox.
- **State**: Allows assistive technology to query whether this checkbox is checked or not. For example, screen readers might use this to decide what to announce.

This is the common trio of [name, role, value](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html) which can be important to make sure your website is accessible.

As far as web developers are concerned, the name, role, value, and state of a node are the main parts of the accessibility tree that you need to worry about. However, there is a lot of other information calculated in the accessibility tree that you might not be aware of. For example, if we just restrict our attention to the [UIAutomation](https://learn.microsoft.com/en-us/dotnet/framework/ui-automation/ui-automation-overview) accessibility API:

- [**Bounding boxes**](https://learn.microsoft.com/en-us/windows/win32/api/uiautomationclient/nf-uiautomationclient-iuiautomationelement-get_currentboundingrectangle): Where is the element located on the screen?
- [**Locale**](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.automationelement.cultureproperty?view=windowsdesktop-7.0): What language should I be interpreting this object with?
- [**FrameworkId**](https://learn.microsoft.com/en-us/dotnet/api/system.windows.automation.automationelement.frameworkidproperty?view=windowsdesktop-7.0): What is the source of this accessibility tree? Is this an accessibility tree coming from Chrome? Is this an accessibility tree coming from Microsoft PowerPoint?

Moving our attention to another accessibility API, [IAccessible2](https://accessibility.linuxfoundation.org/a11yspecs/ia2/docs/html/index.html), gives us more interesting information to look at, with both examples being custom properties that don't seem to formally be part of the IAccessible2 spec:

- [**LayoutTable**](https://github.com/chromium/chromium/blob/dbeac1c32d632c85e62f5ccfefa76151996e65f3/ui/accessibility/platform/ax_platform_node_base.cc#L1462): For the purpose of semantics, [is this a real or fake table](/posts/2023/6/browser-table-accessibility-remediation/)?
- [**CSS Display**](https://github.com/chromium/chromium/blob/dbeac1c32d632c85e62f5ccfefa76151996e65f3/ui/accessibility/platform/ax_platform_node_base.cc#L1250): What is the CSS display for this node?

There is a lot of other information that I am leaving out. While this information isn't the most important to know (although it is good practice to specify locale with [the `lang` attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/lang)), it can be useful to know that the accessibility tree can't be generated just by scanning the DOM — we need information from CSS as well.

<details>
<summary>Regarding CSS Display in an accessibility node</summary>
<div class="details-content">
<p>
Finding this property surprised me. I double checked the source of this data in Chromium, and it does appear to be the <a href="https://github.com/chromium/chromium/blob/6d6ca9492f5c5183bbb1abdabaa4ecf2ece99a2d/third_party/blink/renderer/modules/accessibility/ax_object.cc#L1827">computed CSS style for the display property</a>.
</p>
<p>
I tried searching for similar logic in Firefox, but wasn't able to find anything interesting <a href="https://searchfox.org/mozilla-central/rev/f979f15eaeef504bfdcd27f033323d62b51986cd/accessible/generic/HyperTextAccessible.cpp#409">besides this comment</a>.
</p>
<p>
I don't expect Safari to calculate this, since it seems to be logic specific to IAccessible2 and AT-SPI. Neither of those accessibility APIs are used in Mac products as far as I can tell.
</p>
<p>
What is this ever used for? No idea. I naively searched for it in the NVDA and Orca codebase, and got the following hits.
</p>
<ul>
<li><a href="https://github.com/nvaccess/nvda/blob/186a8d70717234cc48d012e390e43be7b762574b/source/NVDAObjects/IAccessible/ia2TextMozilla.py#L561">NVDA CSS display usage</a></li>
<li><a href="https://gitlab.gnome.org/GNOME/orca/-/blob/eaa47a3e1683ed95d8d9c7fb4dcd8bc4254d8cd6/src/orca/scripts/web/script_utilities.py#L535">Orca CSS display usage</a></li>
</ul>
</div>
</details>

### How can I view the accessibility tree?

You have two choices here, depending on the amount of detail that you need.

The first choice is to use the browser's built-in accessibility tree viewer. You don't see the exact information that is given to assistive technology, as the information needs to be expressed in terms of the platform accessibility APIs, but it's extremely rare that you need that level of detail.

- [Chromium Accessibility Inspector](https://developer.chrome.com/docs/devtools/accessibility/reference/#pane)
- [Firefox Accessibility Inspector](https://firefox-source-docs.mozilla.org/devtools-user/accessibility_inspector/)
- [Safari Web Inspector](https://support.apple.com/guide/safari-developer/view-node-properties-for-a-dom-node-dev160f70435/11.0/mac/10.13)

<details>
<summary>Regarding Chromium's accessibility tree inspector</summary>
<div class="details-content">
<p>The accessibility tree you see in the Chromium developer tools is what is internally known as the Blink tree. For all intents and purposes, this is a peek into the exact data that is being translated into the platform APIs - this isn't some special intermediate representation that the code makes just for the developer tools, in other words. </p>

<p>This logic is handled in <a href="https://github.com/chromium/chromium/blob/main/third_party/blink/renderer/modules/accessibility/inspector_accessibility_agent.cc"><code>InspectorAccessibilityAgent</code></a>.</p>
</div>
</details>

The second choice is to use an external tool that can display the native accessibility tree to you. You have different tools depending on your platform.

- [Dump Tree Utility](https://chromium.googlesource.com/chromium/src/+/master/tools/accessibility/inspect/README.md)
- [Accessibility Insights for Windows](https://accessibilityinsights.io/docs/windows/overview/) (UIAutomation only)
- [Accessibility Inspector on OS X](https://developer.apple.com/library/archive/documentation/Accessibility/Conceptual/AccessibilityMacOSX/OSXAXTestingApps.html)
- [Accerciser](https://help.gnome.org/users/accerciser/stable/introduction.html.en)

These tools are a good way to play around with the native accessibility APIs if you want to take the time. I think it's very rare these tools are useful for web development, though.

## What technologies use the accessibility API?

Remember that an accessibility API allows you to do two things:

- It allows you to programmatically read off the UI of an application through an exposed accessibility tree.
- It allows you to programmatically interact with the UI of an application through nodes on the exposed accessibility tree.

As previously discussed, this allows screen readers to know what to read out when interacting with a page, and allows voice recognition software to know how to respond to specific voice commands from the user. However, there are lots of other assistive and non-assistive technologies that use the accessibility API.

<aside>
<p>
For the following links below, you'll want to copy the link address and paste it into your navigation toolbar rather than trying to activate the link. It seems that Chromium browsers won't let you link directly to the <a href="about://histograms">about://histograms</a> page, and you'll instead get an empty page.
</p>
<p>
Furthermore, depending on how powerful your CPU is, I highly recommend you don't navigate directly to the <a href="about://histograms">about://histograms</a> page, and instead navigate to the specific histograms I talk about below, listed here for convenience:

<ul>
<li><a href="about://histograms/#Accessibility.Performance.HandleAXEvents">about://histograms/#Accessibility.Performance.HandleAXEvents</a></li>
<li><a href="about://histograms/#Accessibility.WinAPIs">about://histograms/#Accessibility.WinAPIs</a></li>
</ul>

The performance on the general <a href="about://histograms">about://histograms</a> page is terrible when I'm using anything that queries the accessibility tree, even on my computer which has a relatively expensive CPU (Ryzen 5950x).

</p>
</aside>

To find out what applications use the accessibility API, we can use the [about://histograms](about://histograms) page on a Chromium based browser to determine whether the browser is calculating accessibility information or not (for performance purposes, the browser doesn't kick off accessibility-related code until it has to).

As a a decent hueristic, if the [histogram for HandleAXEvents](chrome://histograms/#Accessibility.Performance.HandleAXEvents) has more than one data sample, we know that accessibility must have been turned on for some duration while the Chromium browser was running. In other words, some application has been making calls to the accessibility API. You can use this heuristic on any platform Chromium runs on.

We can do better on the Windows platform, though. On Windows, Chromium has a [WinAPIs histogram](chrome://histograms/#Accessibility.WinAPIs) that lets us know how many times specific Windows accessibility APIs were called. The values of the histogram correspond with [this collection of enums](https://github.com/chromium/chromium/blob/dbeac1c32d632c85e62f5ccfefa76151996e65f3/ui/accessibility/platform/ax_platform_node_win.h#L44). So not only do we know if an application is using the accessibility API or not, but we also know precisely what kind of information it is asking for. While not all accessibility API calls are logged, this should still give us some interesting information!

### Onscreen Keyboard

I was very surprised to see that the [onscreen keyboard](https://learn.microsoft.com/en-us/windows/iot/iot-enterprise/os-features/on-screen-keyboard) was making accessibility API calls to Chromium. I launched the onscreen keyboard and typed some random gibberish into google _(the "fdtgdgejcd/cgj" string to be precise)_ and got the following results.

<ul>
<li><strong>UMA_API_GET_ACC_FOCUS:</strong> 6 hits</li>
<li><strong>UMA_API_GET_ACC_PARENT:</strong> 10 hits</li>
<li><strong>UMA_API_GET_ACC_STATE:</strong> 7 hits</li>
<li><strong>UMA_API_GET_UNIQUE_ID:</strong> 8 hits</li>
<li><strong>UMA_API_GET_WINDOW_HANDLE:</strong> 8 hits</li>
<li><strong>UMA_API_IA2_GET_ATTRIBUTES:</strong> 1 hit</li>
<li><strong>UMA_API_QUERY_SERVICE:</strong> 108 hits</li>
<li><strong>UMA_API_ROLE:</strong> 4 hits</li>
</ul>

### Windows Magnifier

Magnification software also makes good use of accessibility APIs. In this workflow, I used the <a href="https://support.microsoft.com/en-us/windows/use-magnifier-to-make-things-on-the-screen-easier-to-see-414948ba-8b1c-d3bd-8615-0e5e32204198">Windows Magnifier</a> and then launched Chromium to the <a href="https://www.w3.org/TR/WCAG21/">WCAG 2.1 guidelines</a>. I then zoomed in to 200%, then zoomed back out to 100%. Here are the results:

<ul>
<li><strong>UMA_API_ACC_LOCATION:</strong> 18 hits</li>
<li><strong>UMA_API_GET_ACC_CHILD:</strong> 41 hits</li>
<li><strong>UMA_API_GET_ACC_FOCUS:</strong> 37 hits</li>
<li><strong>UMA_API_GET_ACC_NAME:</strong> 2 hits</li>
<li><strong>UMA_API_GET_ACC_PARENT:</strong> 112 hits</li>
<li><strong>UMA_API_GET_ACC_ROLE:</strong> 25 hits</li>
<li><strong>UMA_API_GET_ACC_STATE:</strong> 101 hits</li>
<li><strong>UMA_API_GET_UNIQUE_ID:</strong> 186 hits</li>
<li><strong>UMA_API_GET_WINDOW_HANDLE:</strong> 23 hits</li>
<li><strong>UMA_API_IA2_GET_ATTRIBUTES:</strong> 29 hits</li>
<li><strong>UMA_API_QUERY_SERVICE:</strong> 708 hits</li>
<li><strong>UMA_API_ROLE:</strong> 61 hits</li>
</ul>

### Power Automate

[Power Automate](https://powerautomate.microsoft.com/en-us/) is a tool that automates tasks in a UI. I have a simple workflow where I launch an instance of Chrome that navigates to a google search results page for "test", then clicks on the first link in the results. We get the following hits:

<ul>
<li><strong>UMA_API_GET_ACC_PARENT:</strong> 19 hits</li>
<li><strong>UMA_API_GET_ACC_STATE:</strong> 1 hit</li>
<li><strong>UMA_API_GET_UNIQUE_ID:</strong> 4 hits</li>
<li><strong>UMA_API_IA2_GET_ATTRIBUTES:</strong> 1 hit</li>
<li><strong>UMA_API_QUERY_SERVICE:</strong> 82 hits</li>
<li><strong>UMA_API_ROLE:</strong> 1 hit</li>
</ul>

### Grammarly

[Grammarly](https://www.grammarly.com/?transaction_id=102fb088d4330b801810bcaf98b95d&affiliateNetwork=ho&affiliateID=124337) is a tool that attempts to improve your writing skills. The native application seems to have a natural usecase for using the accessibility API - we want to get text from some editable text area in an application, then programmatically insert some different text back if the user accepts Grammarly's suggestions.

Note that in this test I explicitly used the native application version of Grammarly, not the browser extension. The browser extension will not need to use accessibility APIs since it can simply scrape the DOM.

In this workflow, I launched [MDN's textarea article](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/textarea) and typed in the word "salaid" into the provided `<textarea>` element. I then waited for Grammarly to give me an autocorrect suggestion to "salad", and accepted the suggestion. We get the following hits:

<ul>
<li><strong>UMA_API_ACC_LOCATION:</strong> 306 hits</li>
<li><strong>UMA_API_ADD_SELECTION:</strong> 1 hit</li>
<li><strong>UMA_API_GET_ACC_CHILD:</strong> 134 hits</li>
<li><strong>UMA_API_GET_ACC_CHILD_COUNT:</strong> 10 hits</li>
<li><strong>UMA_API_GET_ACC_NAME:</strong>  157 hits</li>
<li><strong>UMA_API_GET_ACC_PARENT:</strong> 871 hits</li>
<li><strong>UMA_API_GET_ACC_ROLE:</strong> 20 hits</li>
<li><strong>UMA_API_GET_ACC_STATE:</strong> 325 hits</li>
<li><strong>UMA_API_GET_ACC_VALUE:</strong> 50 hits</li>
<li><strong>UMA_API_GET_CARET_OFFSET:</strong> 12 hits</li>
<li><strong>UMA_API_GET_CHARACTER_EXTENTS:</strong> 64 hits</li>
<li><strong>UMA_API_GET_INDEX_IN_PARENT:</strong> 8 hits</li>
<li><strong>UMA_API_GET_N_SELECTIONS:</strong> 14 hits</li>
<li><strong>UMA_API_GET_SELECTION:</strong> 3 hits</li>
<li><strong>UMA_API_GET_STATES:</strong> 19 hits</li>
<li><strong>UMA_API_GET_TEXT:</strong> 34 hits</li>
<li><strong>UMA_API_GET_TOOLKIT_NAME:</strong> 22 hits</li>
<li><strong>UMA_API_GET_UNIQUE_ID:</strong> 408 hits</li>
<li><strong>UMA_API_GET_WINDOW_HANDLE:</strong> 142 hits</li>
<li><strong>UMA_API_IA2_GET_ATTRIBUTES:</strong> 364 hits</li>
<li><strong>UMA_API_QUERY_SERVICE:</strong> 6411 hits</li>
<li><strong>UMA_API_ROLE:</strong> 277 hits</li>
<li><strong>UMA_API_SET_SELECTION:</strong> 1 hit</li>
</ul>

<details>
<summary>On Grammarly's accessibility API usage</summary>
<div class="details-content">
<p>These results really surprised me - I didn't expect Grammarly to make such heavy use of these accessibility APIs. I even did this workflow 3 times to make sure I wasn't missing anything, and confirmed that before I launched Grammarly that the WinAPIs histogram had zero entries.
</p>
<p>I wonder how many redundancies are here, although it's hard for me to say without knowing the reasons behind all of these API calls.</p>
</div>
</details>

### Mobile Password Managers

OK, I don't have data here since this is clearly not on Windows. However, notice how you can give accessibility permissions to password managers on Android, and that they can start overlaying their own UI on password fields after you do that. Visiting the [histogram for HandleAXEvents](chrome://histograms/#Accessibility.Performance.HandleAXEvents) on android Chromium does confirm that accessibility mode is turned on, although I can't comment on what API calls they are making.

## How does the browser generate the accessibility tree?

Generating and updating an information dense structure like the accessibility tree in a performant way can be a very interesting technical challenge. This is even more true when the source of data comes from dynamic HTML and CSS, which can be combined in a variety of ways.

While there are lots of things to keep in mind when generating the accessibility tree, we'll restrict our discussion to the basics: how do we generate the **name** and **role** for a given accessibility node?

### Generating the name

Although I'm simplifying a bit, there are three main ways a name can be generated for a node:

- Name from content
- Name from labelling element
- Name from author

**Name from content** is a strategy where the name of a node is derived from its text content. For example, suppose we have the following markup:

```
<a href="/projects">See my projects</a>
```

For the link's accessibility node, browsers are smart enough to make the node's name be the same as the node's text content. This gives screen readers the appropriate name to read, and also allows voice recognition software to click on this link if the user requested it.

<div class="ax-node">
<p>link</p>
<dl>
<dt>Name</dt>
<dd>"See my projects"</dd>
<dt>Role</dt>
<dd>Link</dd>
</dl>
</div>

Browsers adopt a similar strategy for something like a button:

```
<button type="button">Dark theme</button>
```

which would lead to generating an accessibility node that looks something like:

<div class="ax-node">
<p>button</p>
<dl>
<dt>Name</dt>
<dd>"Dark theme"</dd>
<dt>Role</dt>
<dd>Button</dd>
</dl>
</div>

However, note that this strategy can't be implemented in a sensible way for all `HTMLElements`. For example, could we generate a good name from content for even a simple table like the one below?

```
<table>
  <tr>
    <th>Countries</th>
    <th>Capitals</th>
    <th>Population</th>
    <th>Language</th>
  </tr>
  <tr>
    <td>USA</td>
    <td>Washington, D.C.</td>
    <td>309 million</td>
    <td>English</td>
  </tr>
  <tr>
    <td>Sweden</td>
    <td>Stockholm</td>
    <td>9 million</td>
    <td>Swedish</td>
  </tr>
</table>
```

<table>
  <tr>
    <th>Countries</th>
    <th>Capitals</th>
    <th>Population</th>
    <th>Language</th>
  </tr>
  <tr>
    <td>USA</td>
    <td>Washington, D.C.</td>
    <td>309 million</td>
    <td>English</td>
  </tr>
  <tr>
    <td>Sweden</td>
    <td>Stockholm</td>
    <td>9 million</td>
    <td>Swedish</td>
  </tr>
</table>

**Name from labelling elements** is the second strategy browsers use to generate a name for an accessibility node. Certain `HTMLElements` can source their name from a specific `HTMLElement` that serves as a natural label.

For example, going back to the table example from above, we can add a `<caption>` element to source the name from.

```
<table>
  <caption>Some title</caption>
  ...
  <!-- Same table content as before -->
  ...
</table>
```

<table>
  <caption>Some title</caption>
  <tr>
    <th>Countries</th>
    <th>Capitals</th>
    <th>Population</th>
    <th>Language</th>
  </tr>
  <tr>
    <td>USA</td>
    <td>Washington, D.C.</td>
    <td>309 million</td>
    <td>English</td>
  </tr>
  <tr>
    <td>Sweden</td>
    <td>Stockholm</td>
    <td>9 million</td>
    <td>Swedish</td>
  </tr>
</table>

The table can then have an accessibility node that looks something like this:

<div class="ax-node">
<p>table</p>
<dl>
<dt>Name</dt>
<dd>"Some title"</dd>
<dt>Role</dt>
<dd>Table</dd>
</dl>
</div>

An even more natural example is the pairing of an `<input>` and `<label>` element.

```
<label for="input">
  Some label
</label>
<input
  id="input"
  type="checkbox"
  <!-- Whatever other attributes you want -->
/>
```

which will generate an accessibility node that looks something like this:

<div class="ax-node">
<p>checkbox</p>
<dl>
<dt>Name</dt>
<dd>"Some label"</dd>
<dt>Role</dt>
<dd>Checkbox</dd>
</dl>
</div>

**Name from author** is the third strategy browsers can use to generate a name. In this case, the browser relies on the web developer to manually supply an accessible name using the `aria-label` or `aria-labelledby` attributes. A name from author **always** overrides other naming strategies - assuming that the role [supports name from author](https://w3c.github.io/aria/#namefromauthor), anyway. For example, if we had some HTML as follows:

```
<a
  aria-label="Not a chance!"
  href="/projects"
>See my projects</a>
```

the accessibility node that is generated would have the name "Not a chance!":

<div class="ax-node">
<p>link</p>
<dl>
<dt>Name</dt>
<dd>"Not a chance!"</dd>
<dt>Role</dt>
<dd>Link</dd>
</dl>
</div>

Note that using ARIA in this case is extremely bad, as browsers already have a great name it can generate from content. Overriding the name in this way can also make it so voice recognition software won't be able to find the link if a user says "Click see my projects", as this link has a completely different accessible name. See the [Label in Name criterion](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html) for a related discussion.

<div class="details-grouper">
<details>
<summary>Musings on name from content</summary>
<div class="details-content">
<P>
Even though the ARIA spec says that elements with the <code>row</code> role must compute their name from content, <a href="https://github.com/chromium/chromium/blob/540343ddd9868d6a3b82ab7514a6d842e91120f2/third_party/blink/renderer/modules/accessibility/ax_object.cc#L7234">Chromium only does this conditionally</a> for performance purposes.
</P>

<P>
<a href="https://codepen.io/sivakusayan/pen/XWobyEJ">This codepen for conditional row name computations</a> allows you to play around with this behavior. I have only tested this in Chromium, but I haven't tested this behavior in other browsers to see if they also try to make similar optimizations.
</P>
</div>
</details>
<details>
<summary>Musings on CSS contributions to name</summary>
<div class="details-content">
<p>
Did you know that CSS pseudoelements can also contribute to the accessible name of an element? I suggest that you try the <a href="https://codepen.io/sivakusayan/pen/KKbprEj">CSS pseudoname contribution codepen</a> and use the accessibility inspector of your choice to see for yourself. <a href="https://www.w3.org/TR/accname-1.2/#step2F.ii">This behavior is spec'd out</a>, so you should see this behavior in all major browsers.
</p>

<p>
Interestingly, Chromium does some additional work to <a href="https://github.com/chromium/chromium/blob/ac2ea7ef1724b3004bfe884f3d8c709450218f87/third_party/blink/renderer/modules/accessibility/ax_object_cache_impl.cc#L1194">not expose CSS pseudocontent coming from the micro clearfix hack</a> in the accessibility tree. I don't have the time to make a codepen to test this, along with seeing what other browsers do at this time. I'll probably make an edit when I do later, though. 🙂
</p>
</div>
</details>
</div>

### Generating the role

The role of an accessibility node is generally simple to calculate if it has a corresponding HTMLElement. We can first use the role given to us by the ARIA role attribute if it exists. Otherwise, we can just look at the HTML tagname.

For example, consider the following HTML:

```
<button>This is some text</button>
```

The `button` element when translated would just have the button role. Assistive technology know that it can interact with this control as a button, and query for state relevant for buttons.

However, if we added a `role` attribute to it:

```
<button role="link">This is some text</button>
```

Then the `<button>` element would be translated into having the `link` role.
Note that you should generally not do this - if you really need a `link`, just use the `<a>` element.

There are some amounts of complexity to consider though. For example, [not all ARIA roles are valid on all HTMLElements](https://www.w3.org/TR/html-aria/#docconformance).

Second, browsers don't always respect the semantics coming from an HTMLElement, although this is restricted to `tables` and `lists` as far as I'm aware:

- All major browsers implement interesting heuristics to [determine if a table should be exposed as a table](/posts/2023/6/browser-table-accessibility-remediation/). This is done to compensate for bad HTML where the `<table>` element is used as a styling tool rather than to communicate table semantics.
- Safari specifically [attempts to do something similar for lists](https://twitter.com/cookiecrook/status/1337226933822603270). Other browsers don't seem to implement similar heuristics.

## Wrapup

If you take nothing else, the accessibility API is an API that lets you programmatically read off and interact with an application.
When generating the accessibility API, the browser has to consider both HTML and CSS to generate the accessibility tree.


## Edit History

* 9/17/2023: Clarified that <code>aria-label</code> only overrides the name on roles that support name from author. Per the spec, it should not do anything otherwise.