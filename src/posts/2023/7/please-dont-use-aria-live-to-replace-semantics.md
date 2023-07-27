---
title: Please, don't use aria-live to replace semantics
description: There seems to be a common antipattern of abusing aria-live instead of writing semantic markup. This is a bad idea for multiple reasons.
date: 2023-07-26
tags:
  - Accessibility
layout: layouts/post.njk
eleventyExcludeFromCollections: true
---

I have seen a lot of "interesting" implementations of controls that use live regions, instead of semantic markup, to try and be accessible. For example, I have seen things like:

<ul>
<li>A <code>spinbutton</code> that used live regions to manually announce the new value instead of relying on the <code>spinbutton</code> having proper value semantics</li>
<li>A <code>tree</code> control that used live regions to announce the currently focused tree node. State changes were not announced through live regions, so the user would have no idea when a node was collapsed, expanded, checked and so on.</li>
</ul>

<details>
<summary>More "interesting" examples</summary>
<div class="details-content">

<ul>
<li>A <code>grid</code> control that didn't allow focus on each individual cell, but instead forced focus to be on the entire row. When navigating rows, live regions were used to manually announce the content for each cell in the row. Yes, this was extremely unwieldy with large amounts of columns.</li>
<li>A <code>listbox</code> control that would use live regions to announce its accessible name when focused instead of having a programatically defined accessible name.</li>
<ul>

</div>
</details>

Most recently, I learned that the <a href="https://react-select.com/home">react-select library</a> was using this as a strategy, too. While probably well intentioned, this isn't quite as effective as you might think.

Let's talk about why the "live regions as semantics" strategy isn't a great one, using the react-select library as a case study.
This isn't meant to be a pile on the library, but more as a learning example so we can learn to implement better controls.

## It assumes that screen readers are the only type of assistive technology.

I find that code using live regions to force screen reader behavior often don't write semantic markup to start with. This means that browsers can't generate a useful accessibility tree.

This might seem okay when we limit our attention to screen readers, since at the very least we have a <em>(granted, very hacky)</em> read out of semantic information.

However, what happens when we consider assistive technology like Voice Control?

<video preload="none" controls width="250">
    <source src="/posts/resources/voice_control_react_select_test.mp4" type="video/mp4">
    Download the
    <a src="/posts/resources/voice_control_react_select_test.mp4">MP4</a>
    video "Voice Control select element test".
</video>

Notice how Voice Control was unable to programmatically activate the select in the react-select library. The behavior is a little bit better with the other examples, since the other examples allow you to type an option into the input field, and Voice control can dictate there. However, we still end up needing awkward usage of grids and manual keypresses to complete the workflow.

In contrast, notice how nicely and easily Voice Control works with the select element in Safari.

<video preload="none" controls width="250">
    <source src="/posts/resources/voice_control_select_element_test.mp4" type="video/mp4">
    Download the
    <a src="/posts/resources/voice_control_select_element_test.mp4">MP4</a>
    video "Voice Control select element test".
</video>

I'm not saying you have to use the select element - I understand that people might want to have stronger styling capability. However, notice that since the select element actually has an accessibility tree, everything is fine. This work needs to be done for custom select controls too, if you want to work for things besides screen readers.

<details>
<summary>In case you didn't know</summary>
<div class="details-content">

Assistive technology are not the only pieces of software that consume accessibility APIs. Remember that an accessibility API is just a standardized way to:

<ol>
<li>
Gather information about the user interface of an application.
</li>
<li>Take actions on the user interface on behalf of the user.</li>
</ol>

These are very useful capabilities that find use outside of assistive technology, with the easiest examples being UI automation software or native password managers.

There are almost definitely more consumers of these APIs. I'm probably going to write a future blog post where I launch Chromium with logging turned on so I can explore what lesser known applications use these APIs as well.

</div>
</details>

## It doesn't work particularly well with screen readers, either.

When you try to implement accessibility using live regions, you're betting on the fact that raw strings can communicate enough information that a structure like the accessibility tree is unnecessary. I think part of the reason for this misconception is that developers don't know exactly how much heavy lifting is done behind the scenes to implement an accessibility API.

For example, even if the user has a crude understanding of the role and state of something, raw strings will still not give the screen reader itself:

- Programmatic recognition of role and state, which has important implications on its behavior
- Programmatic recognition of what kind of actions you can take on a control
  - Is this a control I can click on?
  - Is this a control I can increment/decrement?
  - Is this a control I can directly set text into?
- Programmatic relationships between different elements in a user interface
  - What are the nodes that this node points to?
  - What are the nodes that point to this node?

This can cause things to go haywire in weird ways.

## It takes away control from the user to customize their experience.

In case you don't know, screen readers have verbosity settings that can control how much or how little information the screen reader conveys to the user. For example, a user might request to not hear accessible descriptions, or request that live regions are ignored altogether.

By manually feeding these strings to the screen reader, you take away the ability of the screen reader to make distinctions.
Here is a link to <a href="https://toot.cafe/@aardrian/110709330614634546">a toot by Adrian Roselli which demonstrates this drawback</a>. Ii

## It reinvents the wheel.

By abusing live regions to communicate semantics, you're essentially trying to implement an application-specific screen reader, as you're manually feeding strings to the screen reader's text to speech engine instead of relying on the more robust screen reader's code to generate those strings.

Not only will this make the experience inconsistent from other sites or applications that the user might use, but unless you know what you're doing, you will also certainly be missing features that the screen reader will provide. However, I think it's likely that a developer experienced with accessibility would not be trying to implement their own custom screen reader, anyway, and would rely on semantics instead.

## Wrapup

You're almost always best off just writing semantic HTML, barring cases where the <code>HTMLElement</code> is still buggy or where you need stronger styling capabilities (but do think if you really need this last one).

I know "semantic HTML" is parroted enough that you're probably tired of reading it, but it's parroted for a reason. There is a non-trivial amount of browser code written for each <code>HTMLElement</code>, and by spinning your own solution you are throwing away all of that free work. After writing semantic HTML, you can always augment its semantics with ARIA if you really need to.

You'll be taking advantage of battle-tested browser and assistive technology code instead of trying to make your own implementation, and it will not be as much of a headache in the long run.
