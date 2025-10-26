---
title: Performance Experiments are Hard
description: A collection of papers from various fields in computer science detailing the challenges of performance measurement.
date: 2025-10-26
layout: layouts/post.njk
---

Running good experiments is obviously hard. This is exemplified by the numerous resources you can find online
about the reproducibility crisis in various scientific fields. Naturally, running performance experiments in computer science
is also hard, and it is too easy to misinterpret the results or to present data which hides the complete story.

I found it interesting how multiple fields of computer science have papers that talk about benchmarking pitfalls in their domains,
and wanted to start compiling a list for myself. Maybe it's useful for you too.

## Systems Programming
- [Producing wrong data without doing anything wrong!](https://dl.acm.org/doi/10.1145/1508284.1508275)
- [Systems Benchmarking Crimes](https://gernot-heiser.org/benchmarking-crimes.html)
- [Can Hardware Performance Counters be Trusted?](https://ieeexplore.ieee.org/document/4636099)
- [Nondeterminism in Hardware Performance Counters](https://ieeexplore.ieee.org/document/6557172)

A note on performance counters. Depending on how paranoid you are, you should double check that the performance counters your tool advertises are actually
listed in your processor manual. For example, when using `perf list`, the tool advertises that I can measure `l2_latency.l2_cycles_waiting_on_fills`,
even though I couldn't find that event anywhere in my Zen3 manual. It seems like the [PR that added support for measuring that event](https://github.com/torvalds/linux/commit/da66658638c947cab0fb157289f03698453ff8d5)
added that event because the measured count was non-zero, even though it wasn't listed in the manual. It was submitted and approved by AMD employees,
so I might just be overly cautious, but I personally wouldn't feel comfortable using that event for any rigorous measurement (and would wonder why there wasn't
a revision to the documentation if it _is_ a valid event).

## Java

- [Statistically rigorous Java performance evaluation](https://dl.acm.org/doi/10.1145/1297027.1297033)
- [The DaCapo Benchmarks: Java Benchmarking Development and Analysis](https://www.cs.purdue.edu/homes/hosking/papers/oopsla06~.pdf)
- [Don’t Trust Your Profiler: An Empirical Study on the Precision and Accuracy of Java Profilers](https://dl.acm.org/doi/10.1145/3617651.3622985)

## Networking

- [RFC 6349: Framework for TCP Throughput Testing](https://datatracker.ietf.org/doc/html/rfc6349)
- [On the effective evaluation of TCP](https://dl.acm.org/doi/10.1145/505696.505703)
- [Why we don't know how to simulate the Internet](https://dl.acm.org/doi/10.1145/268437.268737)
