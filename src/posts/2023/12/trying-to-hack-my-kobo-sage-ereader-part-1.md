---
title: Trying to hack my Kobo Sage eReader — Part 1
description: An underqualified developer tries to make their Kobo Sage bend to their whims.
date: 2023-12-25
tags:
  - Accessibility
layout: layouts/post.njk
---

As someone who has done web development for most of their career, starting to explore other development environments has been extremely cool to me. 

I noticed that the Kobo Sage eReader has a built in browser, although its functionality leaves a lot to be desired (as expected, since it's in beta). For example, it doesn't support `display: flex`, leaving a lot of websites broken. Scrolling through a webpage is also extremely slow, probably because of the inherent limitations of the e-ink display.

I immediately wondered if I could somehow patch the built-in browser to:
* Add `display: flex` support
* Make the webpage scroll take larger 'steps' when scrolling, so scrolling isn't unbearably slow

I will do neither of those two things in this post, mostly because I'm very new to hacking embedded devices and don't really know what I'm doing 🙂. So instead, I wondered if I could do something easier - can I get the "Beta Features" string in the Kobo menu, and replace that string with "Hello World"?

## Poking around the Kobo Sage file system

## Getting root access to the Kobo Sage eReader

The first thing 

## Dumping the Kobo Nickel assembly

## An extremely janky patching of the Nickel assembly

## Success!

## Other Resources