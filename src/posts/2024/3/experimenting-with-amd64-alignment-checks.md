---
title: Experimenting with AMD64 Alignment Checks
description: Turning on the alignment check flag for my Ryzen 5950x just to see what happens.
date: 2024-03-03
tags:
  - Systems
layout: layouts/post.njk
---

While going through the [_Modern
C_](https://gustedt.gitlabpages.inria.fr/modern-c/) book, the author mentioned a
very cool blog post by Ygdrasil that showed [how to enable alignment checks for
Intel x86 processors](https://orchistro.tistory.com/206).

I've heard in some casual conversations that data alignment is largely not
relevant for Intel and AMD processors anymore, although I don't have the
personal experience or expertise to verify the truth of that! However, naively
running the [tests in this blog
post](https://lemire.me/blog/2012/05/31/data-alignment-for-speed-myth-or-reality/)
showed that misaligned accesses were consistently around 10% slower on my
machine, so I guess it isn't obvious to me that the claim is true (or if I did
something wrong in my tests).

In any case, I wanted to try enabling this check for myself just to see what
would happen.

<table-of-contents></table-of-contents>

## The Code

This code is more or less copy-pasted from the code in _Modern C_ and Ygdrasil's
blog post.

```c
#include <stdio.h>

union DoubleInspect {
    double val[2];
    unsigned char buf[sizeof(double)*2];
};

int main(void) {
    __asm__("pushf\n"
            "orl $0x40000, (%rsp)\n"
            "popf");

    union DoubleInspect inspect = { .val = {1,2} };
    printf("base address:\t%p\n", &inspect.buf);

    // Let's do explicit flushes since we don't know if crashing
    // will automatically flush the buffers or not.
    for (size_t offset = sizeof(double); offset; offset /= 2) {
        printf("offset:\t%zu\n", offset);
        fflush(stdout);

        double* misaligned_pointer = (double*)&inspect.buf[offset];
        printf("address with offset:\t%p\n", misaligned_pointer);
        fflush(stdout);

        printf("value at address:\t%f\n", *misaligned_pointer);
        printf("\n");
        fflush(stdout);
    }

    return 0;
}
```

The most important parts of the code above are the inline assembly instructions.

```c
__asm__("pushf\n"
        "orl $0x40000, (%rsp)\n"
        "popf");
```

While Ygdrasil's blog post is specific to Intel processors, the trick they talk
about thankfully seems to be supported by AMD processors, too! One can verify
this by taking a look at the [AMD64 programmer's
manual](https://www.amd.com/content/dam/amd/en/documents/processor-tech-docs/programmer-references/24593.pdf) —
all we're doing is setting bit 18 of the RFLAGs register.

## Running the Code

Strangely, when running the above program, `glibc` seems to immediately crash with this check
enabled. I assume the library does some special things on x86-64 processors, and so assumes that
misaligned data will never crash.

This even happens when running an extremely minimal `hello.c` file:

```c
#include <stdio.h>

int main(void) {
    __asm__("pushf\n"
            "orl $0x40000, (%rsp)\n"
            "popf");

    printf("Hi");
    return 0;
}
```

Here is the backtrace from running the above program in `gdb` if you're curious. It seems that we
crash at [this line of code](https://sourceware.org/git/?p=glibc.git;a=blob;f=stdio-common/vfprintf-internal.c;h=771beca9bf71f4c817800fb44c45c19ec1e3a9d3;hb=HEAD#l635).

```text
Program received signal SIGBUS, Bus error.
0x00007ffff7e37078 in __printf_buffer (buf=buf@entry=0x7fffffffd8b0, format=format@entry=0x7ffff7fc0004 "Hi", ap=ap@entry=0x7fffffffd9a8, mode_flags=mode_flags@entry=0) at vfprintf-internal.c:638
638	  __va_copy (ap_save, ap);
(gdb) bt
#0  0x00007ffff7e37078 in __printf_buffer (buf=buf@entry=0x7fffffffd8b0, format=format@entry=0x7ffff7fc0004 "Hi", ap=ap@entry=0x7fffffffd9a8, mode_flags=mode_flags@entry=0)
    at vfprintf-internal.c:638
#1  0x00007ffff7e392c1 in __vfprintf_internal (s=0x7ffff7fae7a0 <_IO_2_1_stdout_>, format=0x7ffff7fc0004 "Hi", ap=ap@entry=0x7fffffffd9a8, mode_flags=mode_flags@entry=0)
    at vfprintf-internal.c:1544
#2  0x00007ffff7e2f162 in __printf (format=<optimized out>) at printf.c:33
```

We get a similar crash if we replace the call to `printf` with a call to `puts`.
Is this a problem? I'm not too sure if this is a crash the library maintainers need to care about.
But it does make enabling the alignment check useless if you link against `glibc`
and use `printf` in your program (at least on my machine).

If we remove all printing functions from our first code example instead:

```c
union DoubleInspect {
    double val[2];
    unsigned char buf[sizeof(double)*2];
};

int main(void) {
    __asm__("pushf\n"
            "orl $0x40000, (%rsp)\n"
            "popf");

    union DoubleInspect inspect = { .val = {1,2} };

    for (size_t offset = sizeof(double); offset; offset /= 2) {
        double* misaligned_pointer = (double*)&inspect.buf[offset];
        *misaligned_pointer *= *misaligned_pointer;
    }

    return 0;
}
```

And we then compile with debug symbols, we do crash when `misaligned_pointer` is dereferenced, as
expected.

```text
(gdb) r
Starting program: /home/sayan/Development/experiments/c/alignment/a.out
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".

Program received signal SIGBUS, Bus error.
0x00005555555551a4 in main () at main-minimal.c:18
18	        *misaligned_pointer *= *misaligned_pointer;
(gdb) p offset
$1 = 4
(gdb)
```
