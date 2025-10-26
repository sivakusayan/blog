---
title: Observing network interface statistics with iproute2
description: How to view network interface statistics, such as CRC errors or dropped packets.
date: 2025-10-26
layout: layouts/post.njk
isTodayLearned: true
---

I am a big fan of tools that lets you observe the behavior of low level systems, as it is great for learning.
For example, [hardware performance counters](https://en.wikipedia.org/wiki/Hardware_performance_counter) are great for observing
processor behavior that is otherwise transparent for the developer. Similarly, the [herdtools7 suite](https://github.com/herd/herdtools7/tree/master) is
great for observing the behavior of your processor's memory model.

I've been running a networking book club at my workplace, and I'm happy
that the the `ip -s -s link show` command can give me similar low-level visibility into the networking stack of my machine (although in much less detail than the previous two tools). The [kernel documentation](https://docs.kernel.org/networking/statistics.html) describes the output of this tool in a lot of detail. The only
thing I was confused by was what the `transns` entry in the TX errors row meant, as I couldn't find it in the documentation:

```shell
$ ip -s -s link show dev wlo1
3: wlo1: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP mode DORMANT group default qlen 1000
    link/ether 50:c2:e8:ee:f3:57 brd ff:ff:ff:ff:ff:ff
    RX:  bytes packets errors dropped  missed   mcast
     478520149  452566      0       0       0       0
    RX errors:  length    crc   frame    fifo overrun
                     0      0       0       0       0
    TX:  bytes packets errors dropped carrier collsns
      44078438  164580      0       3       0       0
    TX errors: aborted   fifo  window heartbt transns
                     0      0       0       0       4
    altname wlp41s0
    altname wlx50c2e8eef357
```

Thankfully, we can go spelunking in the `iproute2` repository to see what exactly it represents. Searching the for the string `transns` [finds us the code
we want](https://github.com/iproute2/iproute2/blob/1c344b988c1475dc308335afb9ce528b7af3b8d8/ip/ipaddress.c#L642) relatively easily, but it's still not clear to me what a `carrier_change` is, or what a `carrier` even is in the first place. The thorough git commit message helps us a lot though:

```text
commit 30b557929f2aaeeee59e1bbaad7c804bcae40e7b
Author: david decotigny &lt;decot@googlers.com&gt;
Date:   Mon May 5 20:38:18 2014 -0700

    iproute2: show counter of carrier on&lt;-&gt;off transitions

    This patch allows to display the current counter of carrier on&lt;-&gt;off
    transitions (IFLA_CARRIER_CHANGES, see kernel commit &quot;expose number of
    carrier on/off changes&quot;):

      ip -s -s link show dev eth0
      32: eth0: &lt;BROADCAST,MULTICAST,UP,LOWER_UP&gt; mtu 1500 ...
        link/ether ................. brd ff:ff:ff:ff:ff:ff
        RX: bytes  packets  errors  dropped overrun mcast
        125552461  258881   0       0       0       10150
        RX errors: length  crc     frame   fifo    missed
                   0        0       0       0       0
        TX: bytes  packets  errors  dropped carrier collsns
        40426119   224444   0       0       0       0
        TX errors: aborted fifo    window  heartbeat transns
                   0        0       0       0        3

    Tested:
      - kernel with patch &quot;net-sysfs: expose number of carrier on/off
        changes&quot;: see &quot;transns&quot; column above
      - kernel wthout the patch: &quot;transns&quot; not displayed (as expected)

    Signed-off-by: David Decotigny &lt;decot@googlers.com&gt;
```

Sadly, I wasn't able to immediately figure out what a `carrier` was from the [mentioned kernel commit](https://github.com/torvalds/linux/commit/2d3b479df41a10e2f41f9259fcba775bd34de6e4) either. Some resources online seem to imply that `carrier_changes` count the number of times a specific interface went up or down, which seems plausible as the `transns` number seems to go up whenever I manually toggle my computer's `wlo1` interface on and off.
