---
title: A Brief Look at the Mathematics of Structure Packing
date: 2025-07-25
layout: layouts/post.njk
isMathPost: true
---

It's common knowledge (depending on what you do) that the memory layout of a structure in C can
change depending on the order its members were declared in. For example, on my x86-64 processor,
`sizeof(Foo)` is not equal to `sizeof(Bar)`, even though they effectively have the
same members.

```c
struct Foo {
    char firstChar;
    double firstDouble;
    char secondChar;
}

struct Bar {
    double firstDouble;
    char firstChar;
    char secondChar;
}
```

It's also common knowledge that ordering the members of your structure from largest alignment to
smallest will _usually_ (?) give you a size minimizing layout. If this discussion is new to you, there
are lots of good articles and videos on the topic, though [this article](http://www.catb.org/esr/structure-packing) 
seems to be the most popular.

For better or worse, my math background led me to be curious about when the strategy above is or isn't
optimal. More specifically:

- **Does ordering structure members from largest to smallest alignment always give a size minimal
  layout?** <br>It turns out that the answer is no, but we can describe a class of "simple" structures where the answer always is yes!

- **Clang's static analyzer uses a [slightly different algorithm](https://github.com/llvm/llvm-project/blob/main/clang/lib/StaticAnalyzer/Checkers/PaddingChecker.cpp#L230) than what is commonly recommended to
  find an order that minimizes a structure's size. Does this algorithm always find a size minimal
  layout?** <br>It turns out the answer is still no! We can construct an admittedly contrived counterexample
    that we can optimize better by hand. However, the algorithm is correct for a wider class of
    structures than the first algorithm.

I tried to find mathematical answers to the problems above, but I didn't have much luck outside of
people concluding the correctness of these algorithms from trying them out on a couple of very
simple examples.
It's possible that this problem is trivial for people much smarter than me, or that these problems
can be solved by a trivial application of some theory I'm unfamiliar with. But these results weren't
immediately obvious to me, so I'm hoping this is interesting enough to share!

The rest of this blog post fills in the details needed for mathematically proving the above. We
don't need any powerful mathematical tools here - because we restrict the scope of the problem, 
a familiarity with modular arithmetic will be enough.

Note that `pahole` is another tool that developers can use to find structures that aren't as small
as they could be. From what I can tell, it doesn't account for overly aligned members, although it
might do things that Clang's static analyzer doesn't do. For the sake of time, I won't be looking 
too closely at its algorithm, maybe someone else can do that. 🙂

<table-of-contents></table-of-contents>

## Disclaimers

This can become a complicated topic if the scope is too wide, so let's narrow the scope a bit.

1. **I will not analyze structures with bitfield members.** From a cursory reading, it seems like
   the layout of bitfield members in a structure is a complicated implementation-defined topic, and
   I don't really have the hardware knowledge to reason about it in any real way. So let's ignore
   this case for now.

2. **I will not make any claims about the 'performance' of a size minimal layout.** Performance is
   obviously a complicated topic, and what is 'performant' can change depending on the metric you
   are defining performance by. Even worse, designing good experiments is [famously hard](https://dl.acm.org/doi/10.1145/1508284.1508275)!
   The hope is, however, that a size minimal layout will increase the density of data in cache, 
   which *might* make your memory-bound workload faster.

3. **I will assume that we care about alignment.** If not, we can trivially solve the problem by
   adding ` __attribute__((__packed__)) ` to the structure. There has been [some discussion](https://lemire.me/blog/2012/05/31/data-alignment-for-speed-myth-or-reality/) questioning 
   how important alignment is on modern processors, but to my understanding there are still platforms 
   that trap upon unaligned reads or writes. In any case, let's assume we want to find a size minimal layout while
   respecting alignment requirements.
   - In case you're curious, it seems [you can make x86 trap on unaligned reads or writes](https://orchistro.tistory.com/206) if you
     want! The mentioned flag was also present in the manual for my Ryzen 5950x processor, anyway.

## Notation 
We'll use:

- $S$ to denote some arbitrary structure.
- $m_n$ to denote the $n$th member of the structure.
- $s_n$ to denote the `sizeof` member $m_n$.
- $a_n$ to denote the alignment of member $m_n$.
  - Note that this isn't necessarily equal to the `alignof` member $m_n$, as a programmer has the
      option to override the alignment of a structure member.
- $p_n$ to denote the padding between members $m_n$ and $m_{n+1}$ (or the trailing padding if $m_n$
    is the last member of the structure)

It might be interesting to you that we make a distinction between the size $s_n$ and alignment $a_n$
of structure members. This is because they aren't always equal. For example, executing [this program
on Godbolt](https://godbolt.org/#g:!((g:!((h:codeEditor,i:(filename:'1',fontScale:14,fontUsePx:'0',j:1,lang:___c,selection:(endColumn:1,endLineNumber:3,positionColumn:1,positionLineNumber:3,selectionStartColumn:1,selectionStartLineNumber:3,startColumn:1,startLineNumber:3),source:'%23include+%3Cstdio.h%3E%0A%23include+%3Cstdalign.h%3E%0A%0Aint+main(void)+%7B%0A++++printf(%22Size+of+double:+%25lu%5Cn%22,+sizeof(double))%3B%0A++++printf(%22Alignment+of+double:+%25lu%22,+alignof(double))%3B%0A++++return+0%3B%0A%7D%0A'),l:'5',n:'0',o:'C+source+%231',t:'0'),(h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cg151,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:1,lang:___c,libs:!(),options:'',source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+gcc+15.1+(C,+Editor+%231)',t:'0'),(h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cg151,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:2,lang:___c,libs:!(),options:'-m32',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+gcc+15.1+(C,+Editor+%231)',t:'0')),k:100.00000000000001,l:'4',n:'0',o:'',s:0,t:'0')),version:4) 
shows that when compiling for 32 bit systems with the `-m32` flag, `gcc` will report that
`sizeof(double)` is 8 bytes but the `alignof(double)` is 4 bytes.

## Formulating a mathematical definition of `sizeof`

We can't do any mathematics here unless we know how to write `sizeof` down as an equation.
Let's see how we can write it down, and we'll then prove an important property of `sizeof`
that we'll use for the rest of the blog post.

### A potential ambiguity in the definition of `sizeof`

The definition of `sizeof` from the 6.5.3.4, paragraph 4 of the [C23 standard](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf) is:

>When [the sizeof operand is] applied to an operand that has structure or union type, the result is the total number of bytes in such an object, including internal and trailing padding.

However, unless I'm grossly misunderstanding something, I think this definition ambiguous. 
For example, consider the following structure `Foo` in an x86-64 environment:

```c
struct Foo {
    short a; // Takes up bytes 0 through 2 

    int b;   // Pad to a 4 byte boundary, then takes up bytes 4 through 8 

    short c; // No padding needed. Takes up bytes 8 through 10. 

             // Trailing padding needed to make sure consecutive copies of Foo in
             // an array are aligned. Add 2 final bytes of padding.
}
```

The `sizeof` this structure should be 12 bytes. Indeed, this is how `sizeof` is normally computed ([try it out on Godbolt](https://godbolt.org/z/3WEMTjeMe)), 
and this computation is correct as long as the structure `Foo` is aligned on a 4 byte boundary. In other
words, let $M$ be the memory address that `Foo` starts at. Then this computation is correct as long
as:

$$M \equiv 0\pmod{4}$$

and we could visualize the `sizeof` computation as follows (hope you can forgive the sloppy Inkscape):

<?xml version="1.0" encoding="UTF-8"?>
<svg class="overflow-max-content-width" width="651.87" height="108.09" version="1.1" viewBox="0 0 172.47 28.6" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g transform="translate(-8.3978 -9.0627)">
<rect x="23.371" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<rect x="30.422" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<rect x="79.808" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<rect x="86.859" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<rect x="164.66" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<rect x="171.71" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<rect x="108.01" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<rect x="115.06" y="15.084" width="6.9089" height="6.9089" fill-opacity="0" stroke="#000" stroke-width=".39688"/>
<g transform="translate(0 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<g transform="translate(7.0506 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<g transform="translate(3.7492 .30671)">
<g id="f" transform="translate(-.12765 .24731)">
<rect transform="translate(-8.3512 .03607)" x="42.202" y="14.494" width="6.9089" height="6.9089" fill="#8eeb78" stroke="#000" stroke-width=".39688"/>
<path d="m38.269 20.03-3.02-3.02z" fill="#a7cfff" stroke="#000" stroke-width=".39688"/>
<path d="m39.249 18.825-3.02-3.02z" fill="#a7cfff" stroke="#000" stroke-width=".39688"/>
</g>
<use id="d" transform="translate(7.0613)" xlink:href="#f"/>
<use id="b" transform="translate(6.9538)" xlink:href="#d"/>
<use transform="translate(7.1689)" xlink:href="#b"/>
</g>
<g transform="translate(88.388 .30671)">
<g id="e" transform="translate(-.12765 .24731)">
<rect transform="translate(-8.3512 .03607)" x="42.202" y="14.494" width="6.9089" height="6.9089" fill="#8eeb78" stroke="#000" stroke-width=".39688"/>
<path d="m38.269 20.03-3.02-3.02z" fill="#a7cfff" stroke="#000" stroke-width=".39688"/>
<path d="m39.249 18.825-3.02-3.02z" fill="#a7cfff" stroke="#000" stroke-width=".39688"/>
</g>
<use id="c" transform="translate(7.0613)" xlink:href="#e"/>
<use id="a" transform="translate(7.1689)" xlink:href="#c"/>
<use transform="translate(7.1689)" xlink:href="#a"/>
</g>
<g transform="translate(56.437 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<g transform="translate(63.487 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<g transform="translate(84.639 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<g transform="translate(91.69 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<g transform="translate(141.29 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<g transform="translate(148.34 .59009)" stroke="#000" stroke-width=".39688">
<rect x="9.2701" y="14.494" width="6.9089" height="6.9089" fill="#a7baff"/>
<g fill="#a7cfff">
<path d="m10.591 18.95 3.02-3.02z"/>
<path d="m11.796 19.93 3.02-3.02z"/>
</g>
</g>
<text x="15.222" y="11.559965" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="15.222" y="11.559965" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">1</tspan></text>
<text x="8.3176947" y="11.555314" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="8.3176947" y="11.555314" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">0</tspan></text>
<text x="11.340604" y="28.241587" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="11.340604" y="28.241587" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">short</tspan></text>
<text x="68.246185" y="28.241587" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="68.246185" y="28.241587" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">short</tspan></text>
<text x="48.238914" y="28.262516" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="48.238914" y="28.262516" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">int</tspan></text>
<text x="42.280159" y="37.496346" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="42.280159" y="37.496346" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">struct Foo</tspan></text>
<text x="22.291641" y="11.580119" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="22.291641" y="11.580119" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">2</tspan></text>
<text x="29.263273" y="11.556089" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="29.263273" y="11.556089" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">3</tspan></text>
<text x="36.409653" y="11.556089" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="36.409653" y="11.556089" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">4</tspan></text>
<text x="43.452736" y="11.53206" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="43.452736" y="11.53206" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">5</tspan></text>
<text x="50.433151" y="11.553764" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="50.433151" y="11.553764" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">6</tspan></text>
<text x="57.467388" y="11.556089" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="57.467388" y="11.556089" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">7</tspan></text>
<text x="64.604927" y="11.556089" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="64.604927" y="11.556089" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">8</tspan></text>
<text x="71.554825" y="11.556865" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="71.554825" y="11.556865" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">9</tspan></text>
<text x="77.629433" y="11.555314" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="77.629433" y="11.555314" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">10</tspan></text>
<text x="84.741508" y="11.559965" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="84.741508" y="11.559965" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">11</tspan></text>
<text x="91.743675" y="11.580119" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="91.743675" y="11.580119" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">12</tspan></text>
<text x="98.674446" y="11.556089" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="98.674446" y="11.556089" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">13</tspan></text>
<text x="105.32887" y="11.559965" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="105.32887" y="11.559965" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">14</tspan></text>
<text x="112.64304" y="11.535935" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="112.64304" y="11.535935" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">15</tspan></text>
<text x="120.0452" y="11.553764" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="120.0452" y="11.553764" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">16</tspan></text>
<text x="127.15488" y="11.559965" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="127.15488" y="11.559965" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">17</tspan></text>
<g transform="translate(.3358 -1.3786)">
<text x="133.75627" y="12.934712" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">18</tspan></text>
</g>
<g transform="translate(7.437 -1.3778)">
<text x="133.75627" y="12.934712" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">19</tspan></text>
</g>
<g transform="translate(14.722 -1.3786)">
<text x="133.75627" y="12.934712" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">20</tspan></text>
</g>
<g transform="translate(21.758 -1.3546)">
<text x="133.75627" y="12.934712" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">21</tspan></text>
</g>
<g transform="translate(28.835 -1.3546)">
<text x="133.75627" y="12.934712" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">22</tspan></text>
</g>
<g transform="translate(35.963 -1.3786)">
<text x="133.75627" y="12.934712" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">23</tspan></text>
</g>
<g transform="translate(43.099 -1.3546)">
<text x="133.75627" y="12.934712" font-family="Sans" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Sans" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">24</tspan></text>
</g>
<path d="m9.2566 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m16.26 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m23.296 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m30.369 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m37.441 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m44.478 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m51.49 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m58.509 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m65.631 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m72.674 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m79.759 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m86.785 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m93.875 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m100.89 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m107.95 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m114.98 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m122.04 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m129.1 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m136.21 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m150.49 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m157.51 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m164.63 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m171.7 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m178.62 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m143.39 15.213v-2.5498" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m9.3282 22.7v2.2484h13.49v-2.2484" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m66.115 22.7v2.2484h13.49v-2.2484" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m37.48 22.753v2.1431h27.285v-2.1431" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".37"/>
<path d="m9.3441 27.759v5.2626h84.129v-5.2626" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".40261"/>
<text x="127.25977" y="37.515381" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="127.25977" y="37.515381" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">struct Foo</tspan></text>
<path d="m94.324 27.778v5.2626h84.129v-5.2626" fill="none" stroke="#000" stroke-miterlimit="1.1" stroke-width=".40261"/>
</g>
</svg>

Note that the reason we need to add 2 bytes of trailing padding is because if we didn't, then 
the `int` in the second instance of `Foo` would be misaligned.

However, suppose that we hypothetically had a memory allocator that could allocate a memory address $M$ such that 

$$M \equiv 2\pmod{4}$$

That is, it could allocate memory such that the address it returns would have a remainder of 2 when
divided by 4. Then, if we start `Foo` at that memory address, it would have size of 10 bytes: 

- The first member `short a` would already be aligned, and would take up bytes 3 and 4
- The second member `int b` would already be aligned because it would start at a memory address divisible by 4, 
  and would take up bytes 5 through 8.
- The third member `short c` would already be aligned, and would take up bytes 9 and 10 
- There is no trailing padding needed, since in an array the first instance of `Foo` would end on a
  memory address that has remainder 2 when divided by 4, so we can immediately start the next
  instance of `Foo`

We could visualize this computation as follows:

<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!-- Created with Inkscape (http://www.inkscape.org/) -->

<svg
   class="overflow-max-content-width"
   width="651.86621"
   height="109.538"
   viewBox="0 0 172.47293 28.98193"
   version="1.1"
   id="svg1"
   sodipodi:docname="struct-possibility-two.svg"
   inkscape:version="1.4 (e7c3feb1, 2024-10-09)"
   xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
   xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
   xmlns:xlink="http://www.w3.org/1999/xlink"
   xmlns="http://www.w3.org/2000/svg"
   xmlns:svg="http://www.w3.org/2000/svg">
  <sodipodi:namedview
     id="namedview1"
     pagecolor="#ffffff"
     bordercolor="#000000"
     borderopacity="0.25"
     inkscape:showpageshadow="2"
     inkscape:pageopacity="0.0"
     inkscape:pagecheckerboard="0"
     inkscape:deskcolor="#d1d1d1"
     inkscape:document-units="mm"
     inkscape:zoom="1.1988294"
     inkscape:cx="248.15874"
     inkscape:cy="24.190263"
     inkscape:window-width="1512"
     inkscape:window-height="845"
     inkscape:window-x="0"
     inkscape:window-y="38"
     inkscape:window-maximized="1"
     inkscape:current-layer="layer1">
    <inkscape:page
       x="0"
       y="0"
       width="172.47293"
       height="28.98193"
       id="page2"
       margin="0"
       bleed="0" />
  </sodipodi:namedview>
  <defs
     id="defs1" />
  <g
     inkscape:label="Layer 1"
     inkscape:groupmode="layer"
     id="layer1"
     transform="translate(-8.3977933,-9.0627017)">
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect11"
       width="6.9088931"
       height="6.9088931"
       x="9.2700644"
       y="15.083898"
       inkscape:export-filename="rect11.svg"
       inkscape:export-xdpi="96"
       inkscape:export-ydpi="96" />
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect12"
       width="6.9088931"
       height="6.9088931"
       x="16.320635"
       y="15.083898" />
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect20"
       width="6.9088931"
       height="6.9088931"
       x="150.56114"
       y="15.083898" />
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect21"
       width="6.9088931"
       height="6.9088931"
       x="157.61171"
       y="15.083898" />
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect20-5"
       width="6.9088931"
       height="6.9088931"
       x="164.66228"
       y="15.083898" />
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect21-4"
       width="6.9088931"
       height="6.9088931"
       x="171.71284"
       y="15.083898" />
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect24"
       width="6.9088931"
       height="6.9088931"
       x="136.34167"
       y="15.083898" />
    <rect
       style="fill:#000000;fill-opacity:0;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
       id="rect25"
       width="6.9088931"
       height="6.9088931"
       x="143.51056"
       y="15.083898" />
    <g
       id="g31"
       transform="translate(14.10114,0.59008598)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5" />
      </g>
    </g>
    <g
       id="g31-7"
       transform="translate(21.151711,0.59008598)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2-18"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30-9">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30-3" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5-7" />
      </g>
    </g>
    <g
       id="g31-9"
       transform="translate(3.7492449,0.30670542)">
      <g
         id="g32"
         transform="translate(-0.12764846,0.2473103)">
        <rect
           style="fill:#8eeb78;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           id="rect14"
           width="6.9088931"
           height="6.9088931"
           x="42.201988"
           y="14.493812"
           transform="translate(-8.3512386,0.03607008)" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="M 38.268886,20.030413 35.248883,17.010411 Z"
           id="path30-3-8" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="M 39.249057,18.825294 36.229055,15.805292 Z"
           id="path30-5-9-9"
           sodipodi:nodetypes="ccc" />
      </g>
      <use
         x="0"
         y="0"
         xlink:href="#g32"
         id="use33"
         transform="translate(7.0613242)" />
      <use
         x="0"
         y="0"
         xlink:href="#use33"
         id="use34"
         transform="translate(6.9537549)" />
      <use
         x="0"
         y="0"
         xlink:href="#use34"
         id="use35"
         transform="translate(7.1688935)" />
    </g>
    <g
       id="g32-2"
       transform="translate(60.058422,0.5540159)">
      <rect
         style="fill:#8eeb78;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect14-8"
         width="6.9088931"
         height="6.9088931"
         x="42.201988"
         y="14.493812"
         transform="translate(-8.3512386,0.03607008)" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 38.268886,20.030413 35.248883,17.010411 Z"
         id="path30-3-8-4" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 39.249057,18.825294 36.229055,15.805292 Z"
         id="path30-5-9-9-0"
         sodipodi:nodetypes="ccc" />
    </g>
    <g
       id="g31-2"
       transform="translate(56.436825,0.5900858)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2-6"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30-8">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30-9" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5-1" />
      </g>
    </g>
    <g
       id="g31-93"
       transform="translate(63.487395,0.5900858)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2-1"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30-1">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30-4" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5-95" />
      </g>
    </g>
    <g
       id="g31-0"
       transform="translate(70.537965,0.59008598)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2-75"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30-7">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30-50" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5-6" />
      </g>
    </g>
    <g
       id="g31-06"
       transform="translate(77.588532,0.59008598)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2-2"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30-4">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30-7" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5-4" />
      </g>
    </g>
    <g
       id="g31-0-1"
       transform="translate(112.84139,0.59008598)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2-75-3"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30-7-6">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30-50-9" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5-6-0" />
      </g>
    </g>
    <g
       id="g31-06-4"
       transform="translate(119.90271,0.59008598)">
      <rect
         style="fill:#a7baff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect2-2-0"
         width="6.9088931"
         height="6.9088931"
         x="9.2700644"
         y="14.493812" />
      <g
         id="g30-4-2">
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 10.590962,18.949624 3.020002,-3.020003 z"
           id="path30-7-4" />
        <path
           style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
           d="m 11.796081,19.929795 3.020002,-3.020003 z"
           id="path30-5-4-4" />
      </g>
    </g>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="15.222"
       y="11.559965"
       id="text37"><tspan
         sodipodi:role="line"
         id="tspan37"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="15.222"
         y="11.559965">1</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="8.3176947"
       y="11.555314"
       id="text37-6"><tspan
         sodipodi:role="line"
         id="tspan37-0"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="8.3176947"
         y="11.555314">0</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="25.628101"
       y="28.241587"
       id="text37-6-1"><tspan
         sodipodi:role="line"
         id="tspan37-0-8"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="25.628101"
         y="28.241587">short</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="68.246185"
       y="28.241587"
       id="text37-6-1-3"><tspan
         sodipodi:role="line"
         id="tspan37-0-8-7"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="68.246185"
         y="28.241587">short</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="48.238914"
       y="28.262516"
       id="text37-6-1-7"><tspan
         sodipodi:role="line"
         id="tspan37-0-8-2"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="48.238914"
         y="28.262516">int</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="41.611115"
       y="37.897774"
       id="text37-6-1-7-3"><tspan
         sodipodi:role="line"
         id="tspan37-0-8-2-7"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="41.611115"
         y="37.897774">struct Foo</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="22.291641"
       y="11.580119"
       id="text38"><tspan
         sodipodi:role="line"
         id="tspan38"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="22.291641"
         y="11.580119">2</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="29.263273"
       y="11.556089"
       id="text39"><tspan
         sodipodi:role="line"
         id="tspan39"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="29.263273"
         y="11.556089">3</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="36.409653"
       y="11.556089"
       id="text40"><tspan
         sodipodi:role="line"
         id="tspan40"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="36.409653"
         y="11.556089">4</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="43.452736"
       y="11.53206"
       id="text41"><tspan
         sodipodi:role="line"
         id="tspan41"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="43.452736"
         y="11.53206">5</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="50.433151"
       y="11.553764"
       id="text42"><tspan
         sodipodi:role="line"
         id="tspan42"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="50.433151"
         y="11.553764">6</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="57.467388"
       y="11.556089"
       id="text43"><tspan
         sodipodi:role="line"
         id="tspan43"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="57.467388"
         y="11.556089">7</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="64.604927"
       y="11.556089"
       id="text44"><tspan
         sodipodi:role="line"
         id="tspan44"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="64.604927"
         y="11.556089">8</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="71.554825"
       y="11.556865"
       id="text45"><tspan
         sodipodi:role="line"
         id="tspan45"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="71.554825"
         y="11.556865">9</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="77.629433"
       y="11.555314"
       id="text46"><tspan
         sodipodi:role="line"
         id="tspan46"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="77.629433"
         y="11.555314">10</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="84.741508"
       y="11.559965"
       id="text47"><tspan
         sodipodi:role="line"
         id="tspan47"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="84.741508"
         y="11.559965">11</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="91.743675"
       y="11.580119"
       id="text48"><tspan
         sodipodi:role="line"
         id="tspan48"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="91.743675"
         y="11.580119">12</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="98.674446"
       y="11.556089"
       id="text49"><tspan
         sodipodi:role="line"
         id="tspan49"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="98.674446"
         y="11.556089">13</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="105.32887"
       y="11.559965"
       id="text50"><tspan
         sodipodi:role="line"
         id="tspan50"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="105.32887"
         y="11.559965">14</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="112.64304"
       y="11.535935"
       id="text51"><tspan
         sodipodi:role="line"
         id="tspan51"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="112.64304"
         y="11.535935">15</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="120.0452"
       y="11.553764"
       id="text52"><tspan
         sodipodi:role="line"
         id="tspan52"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="120.0452"
         y="11.553764">16</tspan></text>
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="127.15488"
       y="11.559965"
       id="text52-0"><tspan
         sodipodi:role="line"
         id="tspan52-3"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="127.15488"
         y="11.559965">17</tspan></text>
    <g
       id="g1"
       transform="translate(0.33580204,-1.3786228)">
      <text
         xml:space="preserve"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
         x="133.75627"
         y="12.934712"
         id="text52-1"><tspan
           sodipodi:role="line"
           id="tspan52-5"
           style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
           x="133.75627"
           y="12.934712">18</tspan></text>
    </g>
    <g
       id="g1-1"
       transform="translate(7.4369862,-1.3778477)">
      <text
         xml:space="preserve"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
         x="133.75627"
         y="12.934712"
         id="text52-3"><tspan
           sodipodi:role="line"
           id="tspan52-6"
           style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
           x="133.75627"
           y="12.934712">19</tspan></text>
    </g>
    <g
       id="g1-1-2"
       transform="translate(14.722155,-1.3786228)">
      <text
         xml:space="preserve"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
         x="133.75627"
         y="12.934712"
         id="text52-3-5"><tspan
           sodipodi:role="line"
           id="tspan52-6-6"
           style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
           x="133.75627"
           y="12.934712">20</tspan></text>
    </g>
    <g
       id="g1-1-0"
       transform="translate(21.757547,-1.3545933)">
      <text
         xml:space="preserve"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
         x="133.75627"
         y="12.934712"
         id="text52-3-8"><tspan
           sodipodi:role="line"
           id="tspan52-6-2"
           style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
           x="133.75627"
           y="12.934712">21</tspan></text>
    </g>
    <g
       id="g1-1-23"
       transform="translate(28.834679,-1.3545933)">
      <text
         xml:space="preserve"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
         x="133.75627"
         y="12.934712"
         id="text52-3-3"><tspan
           sodipodi:role="line"
           id="tspan52-6-21"
           style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
           x="133.75627"
           y="12.934712">22</tspan></text>
    </g>
    <g
       id="g1-1-9"
       transform="translate(35.962831,-1.3786228)">
      <text
         xml:space="preserve"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
         x="133.75627"
         y="12.934712"
         id="text52-3-1"><tspan
           sodipodi:role="line"
           id="tspan52-6-7"
           style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
           x="133.75627"
           y="12.934712">23</tspan></text>
    </g>
    <g
       id="g1-1-4"
       transform="translate(43.098674,-1.3545933)">
      <text
         xml:space="preserve"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
         x="133.75627"
         y="12.934712"
         id="text52-3-4"><tspan
           sodipodi:role="line"
           id="tspan52-6-4"
           style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Sans;-inkscape-font-specification:'Sans, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
           x="133.75627"
           y="12.934712">24</tspan></text>
    </g>
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 9.2566274,15.212792 V 12.662959"
       id="path57" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 16.259683,15.212792 V 12.662959"
       id="path57-1" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 23.296144,15.212792 V 12.662959"
       id="path57-8" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 30.369017,15.212792 V 12.662959"
       id="path57-5" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 37.440534,15.212791 V 12.662959"
       id="path57-12" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 44.477827,15.212791 V 12.662959"
       id="path57-0" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 51.489506,15.212792 V 12.662959"
       id="path57-2" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 58.508901,15.212791 V 12.662959"
       id="path57-9" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 65.631301,15.212791 V 12.662959"
       id="path57-97" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 72.673941,15.212792 V 12.662959"
       id="path57-57" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 79.758843,15.212792 V 12.662959"
       id="path57-05" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 86.784573,15.212792 V 12.662959"
       id="path57-3" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 93.874913,15.212791 V 12.662959"
       id="path57-11" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 100.88909,15.212792 V 12.662959"
       id="path57-112" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 107.9463,15.212792 V 12.662959"
       id="path57-32" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 114.98049,15.212792 V 12.662959"
       id="path57-80" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 122.03687,15.212792 V 12.662959"
       id="path57-23" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 129.10394,15.212792 V 12.66296"
       id="path57-110" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 136.21312,15.212792 V 12.662959"
       id="path57-52" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 150.49273,15.212792 V 12.662959"
       id="path57-30" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 157.50986,15.212792 V 12.662959"
       id="path57-27" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 164.63316,15.212792 V 12.662959"
       id="path57-01" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 171.69665,15.212791 V 12.662959"
       id="path57-02" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 178.62339,15.212791 V 12.662959"
       id="path57-301" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 143.39363,15.212792 V 12.662959"
       id="path57-4" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 23.615657,22.700141 V 24.94852 H 37.105935 V 22.700141"
       id="path58" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="M 66.115473,22.700141 V 24.94852 H 79.605751 V 22.700141"
       id="path58-7" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.37;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="m 38.146425,22.75106 v 2.146273 H 64.768422 V 22.75106"
       id="path58-4" />
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.37;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="m 23.214727,27.732366 v 5.313702 h 56.521594 v -5.313702"
       id="path58-4-1" />
    <text
       xml:space="preserve"
       style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       x="97.554192"
       y="37.113953"
       id="text37-6-1-7-3-7"><tspan
         sodipodi:role="line"
         id="tspan37-0-8-2-7-4"
         style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000000;fill-opacity:1;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0"
         x="97.554192"
         y="37.113953">struct Foo</tspan></text>
    <path
       style="fill:none;fill-opacity:1;stroke:#000000;stroke-width:0.37;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"
       d="m 80.519127,27.750247 v 5.315837 h 55.452633 v -5.315837"
       id="path58-4-1-5" />
    <g
       id="use64"
       transform="translate(67.10899,0.55401593)">
      <rect
         style="fill:#8eeb78;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect64"
         width="6.9088931"
         height="6.9088931"
         x="42.201988"
         y="14.493812"
         transform="translate(-8.3512386,0.03607008)" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 38.268886,20.030413 35.248883,17.010411 Z"
         id="path64" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 39.249057,18.825294 36.229055,15.805292 Z"
         id="path65"
         sodipodi:nodetypes="ccc" />
    </g>
    <g
       id="use67"
       transform="translate(74.159558,0.55401593)">
      <rect
         style="fill:#8eeb78;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect69"
         width="6.9088931"
         height="6.9088931"
         x="42.201988"
         y="14.493812"
         transform="translate(-8.3512386,0.03607008)" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 38.268886,20.030413 35.248883,17.010411 Z"
         id="path70" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 39.249057,18.825294 36.229055,15.805292 Z"
         id="path71"
         sodipodi:nodetypes="ccc" />
    </g>
    <g
       id="use71"
       transform="translate(81.210133,0.55401593)">
      <rect
         style="fill:#8eeb78;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         id="rect71"
         width="6.9088931"
         height="6.9088931"
         x="42.201988"
         y="14.493812"
         transform="translate(-8.3512386,0.03607008)" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 38.268886,20.030413 35.248883,17.010411 Z"
         id="path72" />
      <path
         style="fill:#a7cfff;fill-opacity:1;stroke:#000000;stroke-width:0.396875;stroke-dasharray:none;stroke-opacity:1"
         d="M 39.249057,18.825294 36.229055,15.805292 Z"
         id="path73"
         sodipodi:nodetypes="ccc" />
    </g>
  </g>
</svg>

As far as I can see, there is nothing wrong with this scenario besides requiring a memory allocator
that is powerful enough to support allocations like this. Indeed, I was curious why it was required
for a structure to have an alignment equal to the alignment of its largest members. I failed to find
anything in the standard about this, and the only online resources I could find claimed that it was 
to allow successive members in an array of structures to be aligned.

- [(StackOverflow) Is the `alignof` of a struct always the maximum `alignof` of its constituents?](https://stackoverflow.com/questions/46009715/is-the-alignof-of-a-struct-always-the-maximum-alignof-of-its-constituents)
- [(StackOverflow) Why does size of the struct need to be a multiple of the largest alignment of any struct member?](https://stackoverflow.com/questions/10309089/why-does-size-of-the-struct-need-to-be-a-multiple-of-the-largest-alignment-of-an)
  - Yes, I know C and C++ are very different. I think this discussion is still relevant to C though,
      and ultimately I'm hoping that our discussion here is abstract enough to be language agnostic.
- [(Quora) In C, why must the size of a struct be divisible by the size of its largest member?](https://www.quora.com/In-C-why-must-the-size-of-a-struct-be-divisible-by-the-size-of-its-largest-member)

However, note that in this constructed example we have a structure that is not aligned by the
alignment of its largest member, and it still allows sensible array layouts that guarantee the
alignment of all structure members.

From this, I claim that `sizeof` is, in reality, a function of two arguments - the structure in question,
and the memory address the structure starts at. We'll resolve this strange inconsistency later,
and we'll prove that: 

$$\text{sizeof}(S,0) = \text{sizeof}(S,M)$$ 

for any memory address $M$ that's divisible by the largest alignment in the structure.
In other words, we will mathematically prove what we usually take for granted: that the value of
`sizeof` effectively only takes one argument as long as the structure is aligned in a particular
way.

<aside>
<p>
We'll actually prove something slightly stronger - that the offsets of structure members from the
beginning of a structure are consistent as long as the structure starts at a memory address
divisible by the structure's largest alignment. 
</p>

<p>
As the above example shows, the offsets can change depending on the memory address a structure
starts at as well! It would certainly be unusable if the size of structures were consistent, but the
offsets inside the structures changed at different memory addresses.
</p>
</aside>

### The equation for `dsizeof`

Before we tackle the problem of `sizeof`, I would like to inspect a simpler concept that will
hopefully make the proof of the consistency of `sizeof` easier to digest.

We're going to [steal a concept from LLVM](https://clang.llvm.org/docs/LanguageExtensions.html#datasizeof) 
known as `__datasizeof`, which is defined to be the `sizeof` a structure but without the tail padding. 
We'll examine the properties of `__datasizeof` first to reduce edge cases needed in our analysis of
`sizeof`, and we'll denote this function mathematically as $\text{dsizeof}$.

To compute an example, let's examine our structure `Foo` again, and determine what
$\text{dsizeof}(\text{Foo}, 0)$ ends up being:

```c
struct Foo {
    short a; // Takes up bytes 0 through 2 
    int b;   // Pad to a 4 byte boundary, then takes up bytes 4 through 8 
    short c; // No padding needed. Takes up bytes 8 through 10. 
}

```

This is basically the same computation as before, except we don't add the 2 bytes of trail padding,
so we end up getting: 

$$\text{dsizeof}(\text{Foo}, 0) = 10$$

Let's come up with a general equation for $\text{dsizeof}$. To give us some room to develop intuition, 
let's first inspect how to compute the `dsizeof` a structure when we (hypothetically) start it at memory 
address 0.

$$
\text{dsizeof}(S, 0) = s_0 + p_0 + s_1 + p_1 + \ldots + s_n
$$

All this is really saying is that the `dsizeof` some structure is the sum of the
structure member sizes and the needed padding $p_i$ between those members.
However, $p_i$ certainly cannot be some arbitrary integer - it must satisfy some constraints:

$$
s_0 + p_0 + .... + s_i + p_i \equiv 0 \pmod{a_{i+1}}
$$

First, the choice of $p_i$ must make the memory address that $m_{i+1}$ starts with divisible by the alignment of
$m_{i+1}$ member. Second, it must be the smallest positive solution that does so, since if we have some integer solution
to the above equation $p_i=k$, then $p_i=k+ca_{i+1}$ is also a solution for any arbitrary
integer $c$. So we add the final restriction on the value of each $p_i$:

$$
0 \leq p_i \lt a_{i+1} 
$$

which guarantees the uniqueness of $p_i$.

### Proving the consistency of `dsizeof`

### The equation for `sizeof`

First, let's carefully define `sizeof` as an equation. I've had people tell me that this looked like
a soup of letters to them, but formulating this as an equation makes the proof as simple as doing
some algebraic operations.


### Proving the consistency of `sizeof`

## Proving that ordering by alignment is optimal for 'simple' structures

## Look at Clang's static analyzer algorithm

