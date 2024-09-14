---
title: What exactly is `perf stat` measuring? 
description: Finding out how to correlate events from the `perf` tool to hardware performance counters on the processor. 
date: 2024-09-14
isTodayLearned: true
tags:
  - Systems
layout: layouts/post.njk
---

I discovered the `perf` tool around two months ago, and it still feels like a shiny new tool to me!
I can take some arbitrary binary `program`, and then run `perf stat ./program` to get a bunch of
very interesting data like what's shown below:

However, what exactly does `cycled-frontend-stalled` and `instruction-cycles`, among others mean? If
we look at the source code of the `perf` tool, in combination with the PPR for the particular
processor in questions, we can figure this out. For example, as I have an AMD Zen3 CPU, I needed to
find the AMD Family 19h PPR. We can get a lot of interesting information from this!

So, what exactly does this mean? No idea - my microarchitecture knowledge is too weak at this point
to comment. But this is probably a good starting point to understanding how to make
processor-specific optimizations.
