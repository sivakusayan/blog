---
title: RIP relative addressing in x86-64 
description: Learning about RIP relative addressing in x86-64.
date: 2024-04-18
isTodayLearned: true
tags:
  - Systems 
layout: layouts/post.njk
---

I was attempting to learn about how [dynamic linking](https://en.wikipedia.org/wiki/Dynamic_linker) worked in Unix systems, and along the way I
encountered the concept of the GOT (Global Offset Table) and PLT (Procedural Linkage Table). I
wanted to see these concepts in action for myself, so I decided to compile a very simple 'Hello World' C
program and debug its assembly:

```c
#include<stdio.h>

int main(void) {
    printf("Hello World");
}
```

If you're already familiar with dynamic linking, you'll know that if we don't link this statically
then the `printf` symbol will be unresolved at compile time, and we'll need to consult the
`.got.plt` section to figure out where the definition lives (or load it if it isn't already
accessible). Here is what that looks like in x86-64 assembly, after using `objdump -D` on the
binary:

```text
0000000000001030 &lt;printf@plt&gt;:
    1030:	ff 25 e2 2f 00 00    	jmp    *0x2fe2(%rip)
    1036:	68 00 00 00 00       	push   $0x0
    103b:	e9 e0 ff ff ff       	jmp    1020 <_init+0x20>
```

The instruction at `1030` is where we consult the `.got.plt` table, but how do we resolve the
address to see where our jump instruction will take us? It turns out that this kind of addressing
mode is called **RIP relative addressing** (also known as **PC relative addressing**), and [Volume 3 of the AMD64 Programmer's Manual
(PDF)](https://www.amd.com/content/dam/amd/en/documents/processor-tech-docs/programmer-references/24594.pdf)
tells us how to resolve this in chapter 1.7:

<blockquote>
<p>
In 64-bit mode, addressing relative to the contents of the 64-bit instruction pointer (program
counter)—called RIP-relative addressing or PC-relative addressing—is implemented for certain
instructions. In such cases, the effective address is formed by adding the displacement to the 64-bit
RIP of the next instruction. 
</p>
</blockquote>

Something that is very important is that the displacement is added to the address of the *next*
instruction, not the current one. In other words, we look at the address obtained from adding 0x1036 and 0x2fe2, giving us 0x4018.
The value at that address should either point to the `printf` symbol, or point to the
invokation of the dynamic linker to load the needed shared object (and only then call `printf`).

```text
$ readelf -x .got.plt a.out

Hex dump of section '.got.plt':
 NOTE: This section has relocations against it, but these have NOT been applied to this dump.
  0x00004000 f83d0000 00000000 00000000 00000000 .=..............
  0x00004010 00000000 00000000 36100000 00000000 ........6.......
```

Aha! It seems that dereferencing 0x4018 resolves to 0x1036 (note that my machine is little endian), which will
jump us to the instruction right after our original jump instruction at 0x1030, as expected. From
here, the dynamic linker will take over and find the definition of `printf` for us.

<details>
<summary>Other types of addressing modes</summary>
While perusing <a href="https://www.amd.com/content/dam/amd/en/documents/processor-tech-docs/programmer-references/24592.pdf">Volume 1 of the AMD64 Programmer's Manual
(PDF)</a>, I found out that there are apparently other types of addressing modes besides absolute addressing
and RIP relative addressing. I encourage you to check out chapter 2.2.3 if you're curious!
</details>
