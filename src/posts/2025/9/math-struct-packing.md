---
title: A Brief Look at the Mathematics of Structure Packing
date: 2025-08-01
layout: layouts/post.njk
isMathPost: true
---

It's common knowledge that the memory layout of a structure in C can
change depending on the order its members were declared in. For example, on my x86-64 processor,
`sizeof(Foo)` is not equal to `sizeof(Bar)`, even though they effectively have the
same members. [You can try it out yourself on Godbolt](https://godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(filename:'1',fontScale:14,fontUsePx:'0',j:1,lang:___c,selection:(endColumn:1,endLineNumber:14,positionColumn:1,positionLineNumber:14,selectionStartColumn:1,selectionStartLineNumber:14,startColumn:1,startLineNumber:14),source:'%23include+%3Cstdio.h%3E%0A%0Astruct+Foo+%7B%0A++++char+firstChar%3B%0A++++double+firstDouble%3B%0A++++char+secondChar%3B%0A%7D%3B%0A%0Astruct+Bar+%7B%0A++++double+firstDouble%3B%0A++++char+firstChar%3B%0A++++char+secondChar%3B%0A%7D%3B%0A%0Aint+main(void)+%7B%0A++++printf(%22Size+of+Foo:+%25zu%5Cn%22,+sizeof(struct+Foo))%3B%0A++++printf(%22Size+of+Bar:+%25zu%22,+sizeof(struct+Bar))%3B%0A++++return+0%3B%0A%7D%0A'),l:'5',n:'0',o:'C+source+%231',t:'0')),k:45.36247334754797,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cclang2010,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:1,lang:___c,libs:!(),options:'',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+clang+20.1.0+(C,+Editor+%231)',t:'0')),header:(),k:26.22601279317697,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cclang2010,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:2,lang:___c,libs:!(),options:'-m32',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+clang+20.1.0+(C,+Editor+%231)',t:'0')),header:(),k:28.411513859275054,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4).

```c
struct Foo {
    char firstChar;
    double firstDouble;
    char secondChar;
};

struct Bar {
    double firstDouble;
    char firstChar;
    char secondChar;
};
```

It's also common knowledge that ordering the members of your structure from largest alignment to
smallest will _usually_ (?) give you a size minimizing layout. If this discussion is new to you, there
are lots of good articles and videos on the topic, though ["The Lost Art of Structure Packing"](http://www.catb.org/esr/structure-packing) 
seems to be the most popular.

For better or worse, my undergraduate math background led me to be curious about when the strategy above is or 
isn't optimal. More specifically, I had two questions:

- **Does ordering structure members from largest to smallest alignment always give a size minimal
  layout?** <br>As most people know, the answer is no, and [it is not hard to construct a counterexample](#counterexample-to-the-ordering-by-alignment-algorithm). But we can describe a class of "simple" structures where the answer always is yes!

- **Clang's [optin.performance.Padding analyzer](https://clang.llvm.org/docs/analyzer/checkers.html#optin-performance-padding) uses a slightly different algorithm than what is commonly recommended to find an order that minimizes a structure's size. Does this algorithm always find a size minimal
  layout?** <br>It turns out the answer is still no! Once again, we can construct [an admittedly contrived counterexample](#counterexample-to-clangs-optin-performance-padding-analyzer)
    that we can optimize better by hand.

I tried to find formal mathematical answers to the problems above, but I didn't have much luck outside of
people concluding the correctness of these algorithms from trying them out on a couple of very
simple examples, giving handwavy proofs that missed edge cases, or just calling the problem trivial. 

It's almost certain that mathematical answers are available in literature I'm unfamiliar with. But I wasn't able to find them, so my curiosity led me to 
try and give answers to the problems above on my own. It was definitely a good homework problem for me, at the very least!

The rest of this blog post fills in the details needed for providing an answer to the first
question above. We don't need any powerful mathematical tools here - because we add so many restrictions 
on the problem, a familiarity with modular arithmetic will be enough. Of course, I haven't done any math in a while, 
so my skills may be rusty and the proofs may contain errors. Please let me know if you find any. 🙂

<table-of-contents></table-of-contents>

## Disclaimers

This can become a complicated topic if the scope is too wide, so let's narrow the scope a bit.

1. **I will not analyze structures with bitfield members.** From a cursory reading, it seems like
   the layout of bitfield members in a structure is a complicated implementation-defined topic.  I don't really have 
   the knowledge to reason about this in any real way across every potential target out there. So let's ignore this case for now.
   - <p>Interestingly enough, <a href="https://github.com/llvm/llvm-project/blob/478b4b012f6c70f799ffeb3523b5a160aed8726b/clang/lib/StaticAnalyzer/Checkers/PaddingChecker.cpp#L169">Clang's static analyzer also considers this case to be hard</a>.</p>

2. **I will not make any claims about the 'performance' of a size minimal layout.** Performance is
   obviously a complicated topic, and what is 'performant' can change depending on the metric you
   are defining performance by. Even worse, designing good experiments is [famously hard](https://dl.acm.org/doi/10.1145/1508284.1508275)!
   The hope is, however, that a size minimal layout will increase the density of data in cache, 
   which *might* make your memory-bound workload faster.
   - <p>Figuring out an "optimally performing" layout of a structure seems to be an active area of
     research. You can search for the keywords <a href="https://scholar.google.com/scholar?hl=en&as_sdt=0%2C50&q=%22structure+splitting%22+AND+%22llvm%22&btnG=">structure splitting</a> and <a href="https://scholar.google.com/scholar?start=0&q=%22field+reordering%22&hl=en&as_sdt=0,50">field reordering</a> if you're
     curious. The literature seems to suggest that it's often smarter to find structure layouts accounting for access patterns rather than purely minimizing size, although that does require having knowledge about what the access pattern of a program looks like.</p>
3. **I will assume that we care about alignment.** If not, we can trivially solve the problem by
   adding ` __attribute__((__packed__)) ` to the structure. There has been [some discussion](https://lemire.me/blog/2012/05/31/data-alignment-for-speed-myth-or-reality/) questioning 
   how important alignment is on modern processors, but to my understanding there are still platforms 
   that trap upon unaligned reads or writes. In any case, let's assume we want to find a size minimal layout while
   respecting alignment requirements.
   - In case you're curious, it seems [you can make x86 trap on unaligned reads or writes](https://orchistro.tistory.com/206) if you
     want! The mentioned flag was also present in the manual for my Ryzen 5950x processor, anyway.

## Vocabulary 
We'll use:

- \\(S\\) to denote some arbitrary structure with \\(n \geq 0\\) members.
  - Again, for the sake of simplicity, let's ignore structures with bitfield members for now.
- \\(m_i\\) to denote the \\(i\\)th member of the structure, with \\(0 \lt i \leq n\\).
- \\(s_i\\) to denote the `sizeof` member \\(m_i\\).
- \\(a_i\\) to denote the alignment of member \\(m_i\\), where \\(a_i=2^{k_i}\\) for some integer \\(k_i \geq 0\\)
  - My hope is that restricting \\(a_i\\) to be a power of 2 is a reasonable assumption. I don't know if
      there are any exotic architectures where that doesn't apply, but if there are this blog post
      does not apply to those architectures.
- \\(a_\text{max}\\) to denote the maximum alignment out of all \\(a_i\\) in \\(S\\). In other words, \\(a_\text{max}\\) is the smallest integer such that \\(a_\text{max} \geq a_i\\)
  for all \\(i\\).
- \\(p_i\\) to denote the padding between members \\(m_i\\) and \\(m_{i+1}\\) (or the trailing padding if \\(m_i\\)
    is the last member of the structure)

Some might be curious why we make a distinction between the size \\(s_i\\) and alignment \\(a_i\\)
of structure members, as I see people conflate the two sometimes. This is because they aren't always equal. For example, executing [this program
on Godbolt](https://godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(filename:'1',fontScale:14,fontUsePx:'0',j:1,lang:___c,selection:(endColumn:1,endLineNumber:9,positionColumn:1,positionLineNumber:9,selectionStartColumn:1,selectionStartLineNumber:9,startColumn:1,startLineNumber:9),source:'%23include+%3Cstdio.h%3E%0A%23include+%3Cstdalign.h%3E%0A%0Aint+main(void)+%7B%0A++++printf(%22Size+of+double:+%25lu%5Cn%22,+sizeof(double))%3B%0A++++printf(%22Alignment+of+double:+%25lu%22,+alignof(double))%3B%0A++++return+0%3B%0A%7D%0A'),l:'5',n:'0',o:'C+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cg151,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:1,lang:___c,libs:!(),options:'',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+gcc+15.1+(C,+Editor+%231)',t:'0')),header:(),k:25,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cg151,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:2,lang:___c,libs:!(),options:'-m32',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+gcc+15.1+(C,+Editor+%231)',t:'0')),header:(),k:25,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4) 
shows that when compiling for 32 bit systems with the `-m32` flag, `gcc` will report that
`sizeof(double)` is 8 bytes but the `alignof(double)` is 4 bytes.

## Formulating a mathematical definition of `sizeof`

We can't do any mathematics here unless we know how to write `sizeof` down as an equation.
Let's attempt to formulate one, and we'll then prove an important property of `sizeof` that
is normally taken for granted.

### A potential ambiguity in the definition of `sizeof`

First off, the definition of `sizeof` from 6.5.3.4, paragraph 4 of the [C23 standard (PDF)](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf) is:

>When [sizeof is] applied to an operand that has structure or union type, the result is the total number of bytes in such an object, including internal and trailing padding.

However, unless I'm grossly misunderstanding something, I think this definition ambiguous. 
For example, consider the following structure `Foo` in an x86-64 environment:

```c
struct Foo {
    short a; // Takes up bytes 0 and 1 

    int b;   // Pad to a 4 byte boundary, then takes up bytes 4 through 7 

    short c; // No padding needed. Takes up bytes 8 and 9. 

             // Trailing padding needed to make sure consecutive 
             // copies of Foo in an array are aligned. As the 
             // alignment of Foo is 4, add 2 final bytes of padding.
}
```

The `sizeof` this structure should be 12 bytes. Indeed, this is how `sizeof` is normally computed ([try it out on Godbolt](https://godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(filename:'1',fontScale:14,fontUsePx:'0',j:1,lang:___c,selection:(endColumn:1,endLineNumber:18,positionColumn:1,positionLineNumber:18,selectionStartColumn:1,selectionStartLineNumber:18,startColumn:1,startLineNumber:18),source:'%23include+%3Cstdio.h%3E%0A%0Astruct+Foo+%7B%0A++++short+a%3B+//+Takes+up+bytes+1+and+2+%0A%0A++++int+b%3B+++//+Pad+to+a+4+byte+boundary,+then+takes+up+bytes+4+through+8+%0A%0A++++short+c%3B+//+No+padding+needed.+Takes+up+bytes+9+and+10.+%0A%0A+++++++++++++//+Trailing+padding+needed+to+make+sure+consecutive+copies+of+Foo+in%0A+++++++++++++//+an+array+are+aligned.+Add+2+final+bytes+of+padding.%0A%7D%3B%0A%0Aint+main(void)+%7B%0A++++printf(%22Sizeof+Foo:+%25zu%22,+sizeof(struct+Foo))%3B%0A++++return+0%3B%0A%7D%0A'),l:'5',n:'0',o:'C+source+%231',t:'0')),k:50,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cg151,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:1,lang:___c,libs:!(),options:'',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+gcc+15.1+(C,+Editor+%231)',t:'0')),header:(),k:50,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4)), 
and this computation is correct as long as the structure `Foo` is aligned on the largest alignment
of its members, which happens to be \\(a_\text{max}=4\\).

Here is another way to state this. Let \\(M\\) be the memory address that `Foo` starts at. Then this computation is correct as long
as:

$$M \equiv 0\pmod{4}$$

and we could visualize the `sizeof` computation above as follows (hope you can forgive the sloppy Inkscape):

<?xml version="1.0" encoding="UTF-8"?>
<svg class="overflow-max-content-width" width="651.87" height="108.09" version="1.1" viewBox="0 0 172.47 28.6" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<title>A visualization of the size computation described in the comments for the Foo struct above. Two instances of Foo are laid side by side, with the first instance of Foo starting at memory address 0.</title>
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
<text x="15.222" y="11.559965" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="15.222" y="11.559965" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">1</tspan></text>
<text x="8.3176947" y="11.555314" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="8.3176947" y="11.555314" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">0</tspan></text>
<text x="11.340604" y="28.241587" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="11.340604" y="28.241587" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">short</tspan></text>
<text x="68.246185" y="28.241587" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="68.246185" y="28.241587" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">short</tspan></text>
<text x="48.238914" y="28.262516" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="48.238914" y="28.262516" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">int</tspan></text>
<text x="42.280159" y="37.496346" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="42.280159" y="37.496346" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".21" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">struct Foo</tspan></text>
<text x="22.291641" y="11.580119" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="22.291641" y="11.580119" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">2</tspan></text>
<text x="29.263273" y="11.556089" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="29.263273" y="11.556089" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">3</tspan></text>
<text x="36.409653" y="11.556089" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="36.409653" y="11.556089" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">4</tspan></text>
<text x="43.452736" y="11.53206" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="43.452736" y="11.53206" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">5</tspan></text>
<text x="50.433151" y="11.553764" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="50.433151" y="11.553764" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">6</tspan></text>
<text x="57.467388" y="11.556089" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="57.467388" y="11.556089" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">7</tspan></text>
<text x="64.604927" y="11.556089" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="64.604927" y="11.556089" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">8</tspan></text>
<text x="71.554825" y="11.556865" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="71.554825" y="11.556865" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">9</tspan></text>
<text x="77.629433" y="11.555314" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="77.629433" y="11.555314" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">10</tspan></text>
<text x="84.741508" y="11.559965" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="84.741508" y="11.559965" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">11</tspan></text>
<text x="91.743675" y="11.580119" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="91.743675" y="11.580119" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">12</tspan></text>
<text x="98.674446" y="11.556089" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="98.674446" y="11.556089" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">13</tspan></text>
<text x="105.32887" y="11.559965" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="105.32887" y="11.559965" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">14</tspan></text>
<text x="112.64304" y="11.535935" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="112.64304" y="11.535935" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">15</tspan></text>
<text x="120.0452" y="11.553764" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="120.0452" y="11.553764" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">16</tspan></text>
<text x="127.15488" y="11.559965" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="127.15488" y="11.559965" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">17</tspan></text>
<g transform="translate(.3358 -1.3786)">
<text x="133.75627" y="12.934712" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">18</tspan></text>
</g>
<g transform="translate(7.437 -1.3778)">
<text x="133.75627" y="12.934712" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">19</tspan></text>
</g>
<g transform="translate(14.722 -1.3786)">
<text x="133.75627" y="12.934712" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">20</tspan></text>
</g>
<g transform="translate(21.758 -1.3546)">
<text x="133.75627" y="12.934712" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">21</tspan></text>
</g>
<g transform="translate(28.835 -1.3546)">
<text x="133.75627" y="12.934712" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">22</tspan></text>
</g>
<g transform="translate(35.963 -1.3786)">
<text x="133.75627" y="12.934712" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">23</tspan></text>
</g>
<g transform="translate(43.099 -1.3546)">
<text x="133.75627" y="12.934712" font-family="Monospace" font-size="3.175px" stroke="#000" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" xml:space="preserve"><tspan x="133.75627" y="12.934712" fill="#000000" font-family="Monospace" font-size="3.175px" stroke-miterlimit="1.1" stroke-width=".2" style="font-style:normal;font-variant:normal;font-weight:normal;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000000;fill-opacity:1;stroke:#000000;stroke-width:0.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1">24</tspan></text>
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

If you're confused why we need to add 2 bytes of trailing padding, suppose that we have an array of
`Foo`. Without the trailing padding in the example above, the `int` in the second instance of `Foo`
would be misaligned.

However, suppose that we hypothetically had a memory allocator that could allocate a memory address \\(M\\) such that 

$$M \equiv 2\pmod{4}$$

That is, it could allocate memory such that the address it returns would have a remainder of 2 when
divided by 4. Then, if we start `Foo` at that memory address, it would have size of 8 bytes: 

- The first member `short a` would already be aligned, and would take up bytes 2 and 3.
- The second member `int b` would already be aligned because it would start at a memory address divisible by 4, 
  and would take up bytes 4 through 7.
- The third member `short c` would already be aligned, and would take up bytes 8 and 9.
- There is no trailing padding needed, since in an array the first instance of `Foo` would end on a
  memory address that has remainder 2 when divided by 4, so we can immediately start the next
  instance of `Foo`.

We could visualize this computation as follows:

<svg class="overflow-max-content-width" height="109.538" id="svg1" version="1.1" viewBox="0 0 172.47293 28.98193" width="651.86621" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><title>A visualization of the size computation described above, where Foo happens to start an unusual alignment. Two instances of Foo are laid side by side, with the first instance of Foo starting at memory address 2.</title><defs id="defs1"/><g id="layer1" transform="translate(-8.3977933,-9.0627017)"><rect height="6.9088931" id="rect11" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="15.083898"/><rect height="6.9088931" id="rect12" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="16.320635" y="15.083898"/><rect height="6.9088931" id="rect20" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="150.56114" y="15.083898"/><rect height="6.9088931" id="rect21" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="157.61171" y="15.083898"/><rect height="6.9088931" id="rect20-5" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="164.66228" y="15.083898"/><rect height="6.9088931" id="rect21-4" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="171.71284" y="15.083898"/><rect height="6.9088931" id="rect24" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="136.34167" y="15.083898"/><rect height="6.9088931" id="rect25" style="fill:#000;fill-opacity:0;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="143.51056" y="15.083898"/><g id="g31" transform="translate(14.10114,0.59008598)"><rect height="6.9088931" id="rect2" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><g id="g31-7" transform="translate(21.151711,0.59008598)"><rect height="6.9088931" id="rect2-18" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30-9"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30-3" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5-7" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><g id="g31-9" transform="translate(3.7492449,0.30670542)"><g id="g32" transform="translate(-0.12764846,0.2473103)"><rect height="6.9088931" id="rect14" style="fill:#8eeb78;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="42.201988" y="14.493812" transform="translate(-8.3512386,0.03607008)"/><path d="M 38.268886,20.030413 35.248883,17.010411 Z" id="path30-3-8" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="M 39.249057,18.825294 36.229055,15.805292 Z" id="path30-5-9-9" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g><use id="use33" transform="translate(7.0613242)" x="0" xlink:href="#g32" y="0"/><use id="use34" transform="translate(6.9537549)" x="0" xlink:href="#use33" y="0"/><use id="use35" transform="translate(7.1688935)" x="0" xlink:href="#use34" y="0"/></g><g id="g32-2" transform="translate(60.058422,0.5540159)"><rect height="6.9088931" id="rect14-8" style="fill:#8eeb78;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="42.201988" y="14.493812" transform="translate(-8.3512386,0.03607008)"/><path d="M 38.268886,20.030413 35.248883,17.010411 Z" id="path30-3-8-4" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="M 39.249057,18.825294 36.229055,15.805292 Z" id="path30-5-9-9-0" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g><g id="g31-2" transform="translate(56.436825,0.5900858)"><rect height="6.9088931" id="rect2-6" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30-8"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30-9" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5-1" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><g id="g31-93" transform="translate(63.487395,0.5900858)"><rect height="6.9088931" id="rect2-1" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30-1"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30-4" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5-95" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><g id="g31-0" transform="translate(70.537965,0.59008598)"><rect height="6.9088931" id="rect2-75" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30-7"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30-50" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5-6" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><g id="g31-06" transform="translate(77.588532,0.59008598)"><rect height="6.9088931" id="rect2-2" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30-4"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30-7" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5-4" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><g id="g31-0-1" transform="translate(112.84139,0.59008598)"><rect height="6.9088931" id="rect2-75-3" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30-7-6"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30-50-9" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5-6-0" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><g id="g31-06-4" transform="translate(119.90271,0.59008598)"><rect height="6.9088931" id="rect2-2-0" style="fill:#a7baff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="9.2700644" y="14.493812"/><g id="g30-4-2"><path d="m 10.590962,18.949624 3.020002,-3.020003 z" id="path30-7-4" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="m 11.796081,19.929795 3.020002,-3.020003 z" id="path30-5-4-4" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g><text id="text37" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="15.222" xml:space="preserve" y="11.559965"><tspan id="tspan37" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="15.222" y="11.559965">1</tspan></text><text id="text37-6" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="8.3176947" xml:space="preserve" y="11.555314"><tspan id="tspan37-0" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="8.3176947" y="11.555314">0</tspan></text><text id="text37-6-1" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="25.628101" xml:space="preserve" y="28.241587"><tspan id="tspan37-0-8" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="25.628101" y="28.241587">short</tspan></text><text id="text37-6-1-3" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="68.246185" xml:space="preserve" y="28.241587"><tspan id="tspan37-0-8-7" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="68.246185" y="28.241587">short</tspan></text><text id="text37-6-1-7" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="48.238914" xml:space="preserve" y="28.262516"><tspan id="tspan37-0-8-2" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="48.238914" y="28.262516">int</tspan></text><text id="text37-6-1-7-3" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="41.611115" xml:space="preserve" y="37.897774"><tspan id="tspan37-0-8-2-7" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="41.611115" y="37.897774">struct Foo</tspan></text><text id="text38" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="22.291641" xml:space="preserve" y="11.580119"><tspan id="tspan38" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="22.291641" y="11.580119">2</tspan></text><text id="text39" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="29.263273" xml:space="preserve" y="11.556089"><tspan id="tspan39" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="29.263273" y="11.556089">3</tspan></text><text id="text40" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="36.409653" xml:space="preserve" y="11.556089"><tspan id="tspan40" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="36.409653" y="11.556089">4</tspan></text><text id="text41" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="43.452736" xml:space="preserve" y="11.53206"><tspan id="tspan41" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="43.452736" y="11.53206">5</tspan></text><text id="text42" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="50.433151" xml:space="preserve" y="11.553764"><tspan id="tspan42" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="50.433151" y="11.553764">6</tspan></text><text id="text43" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="57.467388" xml:space="preserve" y="11.556089"><tspan id="tspan43" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="57.467388" y="11.556089">7</tspan></text><text id="text44" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="64.604927" xml:space="preserve" y="11.556089"><tspan id="tspan44" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="64.604927" y="11.556089">8</tspan></text><text id="text45" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="71.554825" xml:space="preserve" y="11.556865"><tspan id="tspan45" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="71.554825" y="11.556865">9</tspan></text><text id="text46" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="77.629433" xml:space="preserve" y="11.555314"><tspan id="tspan46" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="77.629433" y="11.555314">10</tspan></text><text id="text47" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="84.741508" xml:space="preserve" y="11.559965"><tspan id="tspan47" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="84.741508" y="11.559965">11</tspan></text><text id="text48" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="91.743675" xml:space="preserve" y="11.580119"><tspan id="tspan48" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="91.743675" y="11.580119">12</tspan></text><text id="text49" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="98.674446" xml:space="preserve" y="11.556089"><tspan id="tspan49" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="98.674446" y="11.556089">13</tspan></text><text id="text50" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="105.32887" xml:space="preserve" y="11.559965"><tspan id="tspan50" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="105.32887" y="11.559965">14</tspan></text><text id="text51" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="112.64304" xml:space="preserve" y="11.535935"><tspan id="tspan51" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="112.64304" y="11.535935">15</tspan></text><text id="text52" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="120.0452" xml:space="preserve" y="11.553764"><tspan id="tspan52" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="120.0452" y="11.553764">16</tspan></text><text id="text52-0" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="127.15488" xml:space="preserve" y="11.559965"><tspan id="tspan52-3" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="127.15488" y="11.559965">17</tspan></text><g id="g1" transform="translate(0.33580204,-1.3786228)"><text id="text52-1" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="133.75627" xml:space="preserve" y="12.934712"><tspan id="tspan52-5" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="133.75627" y="12.934712">18</tspan></text></g><g id="g1-1" transform="translate(7.4369862,-1.3778477)"><text id="text52-3" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="133.75627" xml:space="preserve" y="12.934712"><tspan id="tspan52-6" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="133.75627" y="12.934712">19</tspan></text></g><g id="g1-1-2" transform="translate(14.722155,-1.3786228)"><text id="text52-3-5" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="133.75627" xml:space="preserve" y="12.934712"><tspan id="tspan52-6-6" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="133.75627" y="12.934712">20</tspan></text></g><g id="g1-1-0" transform="translate(21.757547,-1.3545933)"><text id="text52-3-8" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="133.75627" xml:space="preserve" y="12.934712"><tspan id="tspan52-6-2" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="133.75627" y="12.934712">21</tspan></text></g><g id="g1-1-23" transform="translate(28.834679,-1.3545933)"><text id="text52-3-3" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="133.75627" xml:space="preserve" y="12.934712"><tspan id="tspan52-6-21" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="133.75627" y="12.934712">22</tspan></text></g><g id="g1-1-9" transform="translate(35.962831,-1.3786228)"><text id="text52-3-1" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="133.75627" xml:space="preserve" y="12.934712"><tspan id="tspan52-6-7" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="133.75627" y="12.934712">23</tspan></text></g><g id="g1-1-4" transform="translate(43.098674,-1.3545933)"><text id="text52-3-4" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="133.75627" xml:space="preserve" y="12.934712"><tspan id="tspan52-6-4" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.2;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="133.75627" y="12.934712">24</tspan></text></g><path d="M 9.2566274,15.212792 V 12.662959" id="path57" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 16.259683,15.212792 V 12.662959" id="path57-1" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 23.296144,15.212792 V 12.662959" id="path57-8" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 30.369017,15.212792 V 12.662959" id="path57-5" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 37.440534,15.212791 V 12.662959" id="path57-12" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 44.477827,15.212791 V 12.662959" id="path57-0" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 51.489506,15.212792 V 12.662959" id="path57-2" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 58.508901,15.212791 V 12.662959" id="path57-9" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 65.631301,15.212791 V 12.662959" id="path57-97" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 72.673941,15.212792 V 12.662959" id="path57-57" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 79.758843,15.212792 V 12.662959" id="path57-05" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 86.784573,15.212792 V 12.662959" id="path57-3" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 93.874913,15.212791 V 12.662959" id="path57-11" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 100.88909,15.212792 V 12.662959" id="path57-112" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 107.9463,15.212792 V 12.662959" id="path57-32" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 114.98049,15.212792 V 12.662959" id="path57-80" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 122.03687,15.212792 V 12.662959" id="path57-23" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 129.10394,15.212792 V 12.66296" id="path57-110" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 136.21312,15.212792 V 12.662959" id="path57-52" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 150.49273,15.212792 V 12.662959" id="path57-30" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 157.50986,15.212792 V 12.662959" id="path57-27" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 164.63316,15.212792 V 12.662959" id="path57-01" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 171.69665,15.212791 V 12.662959" id="path57-02" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 178.62339,15.212791 V 12.662959" id="path57-301" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 143.39363,15.212792 V 12.662959" id="path57-4" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 23.615657,22.700141 V 24.94852 H 37.105935 V 22.700141" id="path58" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="M 66.115473,22.700141 V 24.94852 H 79.605751 V 22.700141" id="path58-7" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.370001;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="m 38.146425,22.75106 v 2.146273 H 64.768422 V 22.75106" id="path58-4" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.37;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><path d="m 23.214727,27.732366 v 5.313702 h 56.521594 v -5.313702" id="path58-4-1" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.37;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><text id="text37-6-1-7-3-7" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;text-align:start;writing-mode:lr-tb;direction:ltr;text-anchor:start;fill:#000;fill-opacity:1;stroke:#000;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1" x="97.554192" xml:space="preserve" y="37.113953"><tspan id="tspan37-0-8-2-7-4" style="font-style:normal;font-variant:normal;font-weight:400;font-stretch:normal;font-size:3.175px;font-family:Monospace;-inkscape-font-specification:'Monospace, Normal';font-variant-ligatures:normal;font-variant-caps:normal;font-variant-numeric:normal;font-variant-east-asian:normal;fill:#000;fill-opacity:1;stroke-width:.21;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0" x="97.554192" y="37.113953">struct Foo</tspan></text><path d="m 80.519127,27.750247 v 5.315837 h 55.452633 v -5.315837" id="path58-4-1-5" style="fill:none;fill-opacity:1;stroke:#000;stroke-width:.37;stroke-miterlimit:1.1;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1"/><g id="use64" transform="translate(67.10899,0.55401593)"><rect height="6.9088931" id="rect64" style="fill:#8eeb78;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="42.201988" y="14.493812" transform="translate(-8.3512386,0.03607008)"/><path d="M 38.268886,20.030413 35.248883,17.010411 Z" id="path64" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="M 39.249057,18.825294 36.229055,15.805292 Z" id="path65" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g><g id="use67" transform="translate(74.159558,0.55401593)"><rect height="6.9088931" id="rect69" style="fill:#8eeb78;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="42.201988" y="14.493812" transform="translate(-8.3512386,0.03607008)"/><path d="M 38.268886,20.030413 35.248883,17.010411 Z" id="path70" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="M 39.249057,18.825294 36.229055,15.805292 Z" id="path71" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g><g id="use71" transform="translate(81.210133,0.55401593)"><rect height="6.9088931" id="rect71" style="fill:#8eeb78;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1" width="6.9088931" x="42.201988" y="14.493812" transform="translate(-8.3512386,0.03607008)"/><path d="M 38.268886,20.030413 35.248883,17.010411 Z" id="path72" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/><path d="M 39.249057,18.825294 36.229055,15.805292 Z" id="path73" style="fill:#a7cfff;fill-opacity:1;stroke:#000;stroke-width:.396875;stroke-dasharray:none;stroke-opacity:1"/></g></g></svg>

As far as I can see, there is nothing mathematically wrong with this scenario besides requiring a hypothetical 
memory allocator that is flexible enough to support allocations like this.

Indeed, I was curious why it was required for a structure to have an alignment equal to the alignment of its largest members. 
I failed to find anything in the standard about this, and the only online resources I could find claimed 
that it was to allow successive members in an array of structures to be aligned.

- [(StackOverflow) Is the `alignof` of a struct always the maximum `alignof` of its constituents?](https://stackoverflow.com/questions/46009715/is-the-alignof-of-a-struct-always-the-maximum-alignof-of-its-constituents)
- [(StackOverflow) Why does size of the struct need to be a multiple of the largest alignment of any struct member?](https://stackoverflow.com/questions/10309089/why-does-size-of-the-struct-need-to-be-a-multiple-of-the-largest-alignment-of-an)
  - Yes, I know C and C++ are very different. I think this discussion is still relevant to C though,
      and ultimately I'm hoping that our discussion here is abstract enough to be language agnostic.
- [(Quora) In C, why must the size of a struct be divisible by the size of its largest member?](https://www.quora.com/In-C-why-must-the-size-of-a-struct-be-divisible-by-the-size-of-its-largest-member)
- [(Algorithms for Modern Hardware) Structure Alignment](https://en.algorithmica.org/hpc/cpu-cache/alignment/#structure-alignment)

However, note that in this constructed example we have a structure that is not aligned by the
alignment of its largest member, and it still allows sensible array layouts that guarantee the
alignment of all structure members.

Of course, it (maybe?) isn't useful to create a memory allocator that is flexible enough to support the
allocations above. The struct `Foo` has an ordering of its members that ensures that `sizeof(struct
Foo) = 8` even when \\(M \equiv 0 \pmod{4}\\):

```c
// Ordering the members of Foo from largest alignment
// to smallest will give it the smallest size possible.
struct Foo {
    int b;
    short a;
    short c;
}
```

However, I hope the strange example I gave shows that it isn't immediately obvious that `sizeof`
will give the same value no matter what memory address we place the structure at, even if we
restrict placing the structure at memory addresses that result in usable array layouts.

From this, I claim that `sizeof` is, in reality, a function of two arguments when applied to structures:

$$
\text{sizeof}(S,M)
$$

where the first argument \\(S\\) is the structure in question, and the second argument \\(M\\) is the memory address the structure starts at. 
We'll resolve this strange inconsistency later, and we'll prove that: 

$$\text{sizeof}(S,0) = \text{sizeof}(S,M)$$ 

if the memory address \\(M\\) is divisible by the largest alignment \\(a_\text{max}\\) in the structure \\(S\\).
In other words, we will mathematically prove what we usually take for granted: that the value of
`sizeof` effectively only takes one argument as long as the structure is aligned in a particular
way.

<aside>
<p>
We'll actually prove something slightly stronger - that the offsets of structure members are consistent as 
long as the structure starts at a memory address divisible by the structure's largest alignment. 
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
`sizeof`, and we'll denote this function mathematically as \\(\text{dsizeof}\\).

Similar to `sizeof`, it turns out that \\(\text{dsizeof}\\) is a function of two arguments:

$$
\text{dsizeof}(S,M)
$$

where, once again, the first argument \\(S\\) is the structure in question, and the second argument \\(M\\) is the memory address the structure starts at. 

To compute an example, let's examine our structure `Foo` again, and determine what
\\(\text{dsizeof}(\text{Foo}, 0)\\) ends up being:

```c
struct Foo {
    short a; // Takes up bytes 0 and 1 
    int b;   // Pad to a 4 byte boundary, then takes up bytes 4 through 7 
    short c; // No padding needed. Takes up bytes 8 and 9. 
}

```

This is basically the same computation as before, except we don't add the 2 bytes of trail padding,
so we end up getting: 

$$\text{dsizeof}(\text{Foo}, 0) = 10$$

Similarly, if we want to compute \\(\text{dsizeof}(\text{Foo}, 2)\\), we can recall from the
previous section that:

```c
struct Foo {
    short a; // Takes up bytes 2 and 3 
    int b;   // No padding needed. Takes up bytes 4 through 7 
    short c; // No padding needed. Takes up bytes 8 and 9. 
}

```

and so we compute:

$$
\text{dsizeof}(\text{Foo}, 2) = 8
$$

Armed with some examples, let's come up with a general equation for \\(\text{dsizeof}\\). 
Let \\(M\\) be the memory address that a structure \\(S\\) starts at. Then we can compute 
\\(\text{dsizeof}(S,M)\\) as follows:

$$
\text{dsizeof}(S, M) = s_1 + p_1 + s_2 + p_2 + \ldots + s_{n-1} + p_{n-1} + s_n
$$

All this is really saying is that the `dsizeof` some structure is the sum of the
structure member sizes and the needed padding between those members.

However, for \\(0 \lt i \lt n\\), we know that \\(p_i\\) cannot be some arbitrary integer - it must satisfy two constraints.
First, the choice of \\(p_i\\) must make it so the memory address of \\(m_{i+1}\\) is divisible by \\(a_{i+1}\\). 
In other words, the padding must be chosen to make sure the memory address of the structure's next member respects that member's alignment. 

If we notice that the expression \\(M + s_1 + p_1 + \ldots + s_i + p_i\\) represents the starting memory address of member
\\(m_{i+1}\\), we can encode this requirement recursively as:

$$
M + s_1 + p_1 + \ldots + s_i + p_i \equiv 0 \pmod{a_{i+1}}
$$

Second, we must ensure that \\(p_i\\) is the smallest positive solution to the above equation. 
This is because if we have some integer solution to the above equation \\(p_i=k\\), then \\(p_i=k+ca_{i+1}\\) is also a solution for any arbitrary
integer \\(c\\). So we add the final restriction on the value of each \\(p_i\\):

$$
0 \leq p_i \lt a_{i+1} 
$$

which guarantees the uniqueness of \\(p_i\\).

### Proving the consistency of `dsizeof`

As an intermediary step to proving the consistency of `sizeof`, we would like the prove the
following lemma:

**Lemma 1:** Let \\(M\\) be any memory address evenly divisible by \\(a_\text{max}\\), the largest alignment in \\(S\\).
Then we have that:
$$
\text{dsizeof}(S,0) = \text{dsizeof}(S,M)
$$

**Proof:** We'll need to come up with some notation to differentiate the paddings in both
sides of the equation. For \\(0 \lt i \leq n-1\\), we'll write \\(p_i\\) to denote the paddings inside of
\\(\text{dsizeof}(S, 0)\\), and we'll write \\(b_i\\) to denote the paddings inside of \\(\text{dsizeof}(S, M)\\).
Thus, our equations become:

$$
\text{dsizeof}(S, 0) = s_1 + p_1 + s_2 + p_2 + \ldots + s_{n-1} + p_{n-1} + s_n
$$
$$
\text{dsizeof}(S, M) = s_1 + b_1 + s_2 + b_2 + \ldots + s_{n-1} + b_{n-1} + s_n
$$

All we need to show is that for any \\(i\\), we have \\(b_i = p_i\\), at which point we know that
\\(\text{dsizeof}(S, 0) = \text{dsizeof}(S, M)\\).

First, recall our restrictions that each padding must satisfy. We know that for each \\(p_i\\) and
\\(b_i\\):

$$
\begin{align}
0 + s_1 + p_1 + \ldots + s_i + p_i \equiv 0 \pmod{a_{i+1}} \\\\
M + s_1 + b_1 + \ldots + s_i + b_i \equiv 0 \pmod{a_{i+1}}
\end{align}
$$
$$
\begin{align*}
0 \leq p_i \lt a_{i+1} \\\\
0 \leq b_i \lt a_{i+1} 
\end{align*}
$$

However, in the case of equation (2), we know that by definition \\(M\\) is divisible by the greatest alignment
\\(a_{\text{max}}=2^{k_{\text{max}}}\\)
in \\(S\\). Since we know that each \\(a_i=2^{k_i} \leq 2^{k_{\text{max}}}\\), 
that means that \\(M\\) is divisible by any \\({a_i}\\), and so \\(M \equiv 0 \pmod{a_i}\\) for all \\(i\\). 

So we can instead transform equation (2) into:

$$
\begin{align*}
M + s_1 + b_1 + \ldots + s_i + b_i \equiv 0 \pmod{a_{i+1}} \\\\
0 + s_1 + b_1 + \ldots + s_i + b_i \equiv 0 \pmod{a_{i+1}} \\\\
s_1 + b_1 + \ldots + s_i + b_i \equiv 0 \pmod{a_{i+1}}
\end{align*}
$$

We now have the pair of equations below that we can do mathematical induction over to show that each \\(b_i = p_i\\):

$$
\begin{align}
s_1 + p_1 + \ldots + s_i + p_i \equiv 0 \pmod{a_{i+1}} \\\\
s_1 + b_1 + \ldots + s_i + b_i \equiv 0 \pmod{a_{i+1}}
\end{align}
$$

Let's start with the case of \\(i=1\\). Then we have the equations:

$$
\begin{align}
s_1 + p_1 \equiv 0 \pmod{a_2} \\\\
s_1 + b_1 \equiv 0 \pmod{a_2}
\end{align}
$$

However, since the lefthand sides of (5) and (6) are both equivalent to \\(0 \pmod{a_2}\\), we can then write:
$$
\begin{align}
s_1 + p_1 \equiv s_1 + b_1 \pmod{a_2} \\\\
p_1 \equiv b_1 \pmod{a_2}
\end{align}
$$

So we know that \\(p_1\\) and \\(b_1\\) are in the same equivalence class. However, by our constraints on the padding between
structure members, we know that \\(0 \leq p_1 \lt a_2\\), and \\(0 \leq b_1 \lt a_2\\). From there, we know that \\(p_1=b_1\\), and we are done with the base case.

Now, we need to handle the induction step. We need to show that, for any \\(1 \lt i \leq n - 1\\), if \\(p_{j}=b_{j}\\) for all \\(1 \leq j \lt i\\), then
\\(p_{i}=b_{i}\\). However, we can solve this by similar techniques used to prove the base case.
Recall from equations (3) and (4) that we have:

$$
\begin{align*}
s_1 + p_1 + \ldots + s_i + p_i \equiv 0 \pmod{a_{i+1}} \\\\
s_1 + b_1 + \ldots + s_i + b_i \equiv 0 \pmod{a_{i+1}} \\\\
\end{align*}
$$

Once again, since the lefthand sides of (3) and (4) are both equivalent to \\(0 \pmod{a_{i+1}}\\), we can set
them equal to each other: 

$$
\begin{equation}
s_1 + b_1 + \ldots + s_i + b_i \equiv s_1 + p_1 + \ldots + s_i + p_i  \pmod{a_{i+1}}
\end{equation}
$$

And by the induction step we know that \\(b_j=p_j\\) for each \\(j\\), so we can
rewrite (9) by substituting each of the \\(b_j\\) on the lefthand side with \\(p_j\\):

$$
\begin{equation}
s_1 + p_1 + \ldots + s_i + b_i \equiv s_1 + p_1 + \ldots + s_i + p_i  \pmod{a_{i+1}}
\end{equation}
$$

so we can subtract the terms \\(s_1 + p_1 + \ldots + s_i\\) from both sides of (10) to get:

$$
\begin{equation}
b_i \equiv p_i \pmod{a_{i+1}}
\end{equation}
$$

So \\(b_i\\) and \\(p_i\\) are in the same equivalence class. However, once again, because \\(0 \leq b_i \lt
a_{i+1}\\), and \\(0 \leq p_i \lt a_{i+1}\\), we know that \\(p_i=b_i\\) for any \\(i\\). That completes the induction, and since all of the paddings are
pairwise equal, we are done with the proof. <span class="qed">\\(\blacksquare\\)</span>


### The equation for `sizeof`

Okay, we now have a mathematical formula for \\(\text{dsizeof}(S,M)\\) and we know it's consistent when we have
certain restrictions on the memory address \\(M\\). We would like to use this to come up with an
equation for `sizeof`.

This should be simple enough. Since \\(\text{dsizeof}\\) is simply `sizeof` without the
trailing padding, we can write:

$$
\text{sizeof}(S,M) = \text{dsizeof}(S,M) + p
$$

where \\(p\\) represents the trailing padding of the structure. Once again, \\(p\\) cannot be arbitrary. If we denote by \\(a_{\text{max}}\\) the maximum alignment
of all structure members in \\(S\\), we must choose \\(p\\) such that \\(0 \leq p \lt
a_\text{max}\\) and:

$$
M + \text{dsizeof}(S,M) + p \equiv 0 \pmod{a_\text{max}}
$$

so that in an array, the next instance of \\(S\\) will be aligned.

However, recall that the above statement isn't completely correct, as it assumes that the only valid
alignment for \\(S\\) is for it to be aligned on \\(a_\text{max}\\). As the discussion in 
["A potential ambiguity in the definition of `sizeof`"](#a-potential-ambiguity-in-the-definition-of-sizeof) shows, 
we can have "valid" alignments of \\(S\\) that are not just the largest alignment in \\(S\\). 

In order to simplify things, I will again restrict this scope of this blog post - we will only study the mathematics of 
structures aligned on the largest alignment of their members. Thus, the equation above becomes valid again.

### Proving the consistency of `sizeof`

We finally get to the important lemma that we need before we can even begin to think about finding
the minima of `sizeof`.

**Lemma 2:** Let \\(M\\) be any memory address evenly divisible by the \\(a_\text{max}\\), the largest alignment in \\(S\\).
Then we have that:
$$
\text{sizeof}(S,0) = \text{sizeof}(S,M)
$$
**Proof:** Expanding the definition of \\(\text{sizeof}\\), we have:

$$
\begin{align}
\text{sizeof}(S,0) = \text{dsizeof}(S,0) + p \\\\
\text{sizeof}(S,M) = \text{dsizeof}(S,M) + b
\end{align}
$$

where \\(p\\) and \\(b\\) respectively must satisfy the constraints:

$$
\begin{align}
\text{dsizeof}(S,0) + p \equiv 0 \pmod{a_\text{max}} \\\\
M + \text{dsizeof}(S,M) + b \equiv 0 \pmod{a_\text{max}}
\end{align}
$$

Recall that by **Lemma 1** we know that \\(\text{dsizeof}(S,0)=\text{dsizeof}(S,M)\\), so it suffices
to show that the trailing paddings \\(p\\) and \\(b\\) are equal.

By our choice of \\(M\\), we know that \\(M \equiv 0 \pmod{a_\text{max}}\\), and so with (14) and (15) we have:

$$
\begin{align}
\text{dsizeof}(S,0) + p \equiv \text{dsizeof}(S,M) + b \pmod{a_\text{max}} \\\\
p = b \pmod{a_\text{max}}
\end{align}
$$

And since we have both \\(0 \leq p \lt a_\text{max}\\) and \\(0 \leq b \lt a_\text{max}\\), we know that \\(p=b\\) and we are done. <span class="qed">\\(\blacksquare\\)</span>

## When is ordering by alignment optimal? 

We finally have a good mathematical definition of `sizeof`, and we have shown that the value of
`sizeof` is consistent as long as we align the structure \\(S\\) on the largest alignment of its
members \\(a_\text{max}\\). Let's try to find out when the value of `sizeof` is minimized.

### Primitive structures 

To keep our mathematics simple, we're going to restrict the class of structures that we study once
more. To start with, we're going to define a **primitive** structure as any structure where, for
each member \\(m_i\\), we have it that \\(s_i = ca_i\\) for some \\(c \geq 0\\). In other words, the
size of each structure member is a multiple of the same member's alignment.

Loosely speaking, this is a structure whose members are all primitives, and so is one of the
simplest structures we can reason about. Furthermore, no structure members have "unusual alignments"
that were manually given to them by the programmer through specifiers such as `alignas`.

For example, `Foo` and `Bar` would be primitive structures, but `Baz` is not:

```c
// Nothing out of the ordinary here, this is definitely primitive.
struct Foo {
    int first;
    double second;
    char third;
}

// First off, recall when targeting 32-bit x86, GCC asserts that double has an alignment
// of 4, so this specifier is not a no-op. Secondly, even though the programmer manually
// overrides the alignment, this is still a primitive structure as the size is a multiple
// of its alignment.
struct Bar {
    int first;
    alignas(8) double second;
}

// This is definitely not primitive, as (assuming we are on 32-bit or 64-bit systems),
// 32 does not evenly divide into the double's size of 8.
struct Baz {
    int first;
    alignas(32) double second;
}
```

You might have already noticed that it is not just structures with primitive members that can be considered primitive 
structures - structures containing fixed length arrays and nested structures qualify as well, as long as they weren't given
unusual alignments. However, we'll get to that later.

### Ordering members of a primitive structure by alignment minimizes dsizeof 

We're going to prove an intermediary lemma. I've seen people online use this style of argument to
justify that ordering the members of a structure from largest to smallest alignment optimizes the
size, albeit in a handwavy way. We'll fill in the skipped details here. 

**Lemma 3:** Let \\(S\\) be a primitive structure aligned on \\(a_\text{max}\\), the largest alignment in \\(S\\). 
Ordering the members of \\(S\\) from largest to smallest alignment will minimize the value of \\(\text{dsizeof(S, M)}\\).

**Proof:** Recall the definition of \\(\text{dsizeof}(S, M)\\):

$$
\text{dsizeof}(S, M) = s_1 + p_1 + s_2 + p_2 + \ldots + s_{n-1} + p_{n-1} + s_n \\
$$

It suffices to show that ordering the members of \\(S\\) from the largest to smallest alignment
will make each of the intermediary paddings \\(p_i=0\\), for \\(0 \lt i \leq n-1\\). We do this by mathematical induction.

First, we prove the base case. We want to show that if we choose an ordering of structure members such that \\(a_1 \geq a_2\\), 
then \\(p_1=0\\), where \\(p_1\\) must satisfy:

$$
\begin{align}
M + s_1 + p_1 \equiv 0 \pmod{a_2} \\\\
0 + s_1 + p_1 \equiv 0 \pmod{a_2} \\\\
s_1 + p_1 \equiv 0 \pmod{a_2}
\end{align}
$$

However, since \\(S\\) is a primitive structure, we know that \\(s_1=c_1a_1\\) for some
positive integer \\(c_1\\). Since \\(2^{k_1} = a_1 \geq a_2 = 2^{k_2}\\), we know that \\(a_1\\) is evenly divisible by \\(a_2\\), 
and thus \\(s_1\\) is evenly divisible by \\(a_2\\). 

However, by equation (20) we know that \\(p_1 \equiv 0 \pmod{a_2}\\) and since \\(0 \leq p_1 \lt
a_2\\) we immediately know that \\(p_1=0\\). 

Next, we prove the induction step. We need to show that, for any \\(1 \lt i \leq n\\), if \\(p_{j}=0\\) for all \\(1 \leq j \lt i\\), then
\\(p_{i}=0\\). Recall that \\(p_i\\) must satisfy the following:

$$
\begin{align}
M + s_1 + p_1 + \ldots s_{i-1} + p_{i-1} + s_i + p_i \equiv 0 \pmod{a_{i+1}} \\\\
0 + s_1 + p_1 + \ldots s_{i-1} + p_{i-1} + s_i + p_i \equiv 0 \pmod{a_{i+1}} \\\\
s_1 + p_1 + \ldots s_{i-1} + p_{i-1} + s_i + p_i \equiv 0 \pmod{a_{i+1}}
\end{align}
$$

But since all \\(p_j=0\\), we know from equation (23) that:

$$
s_1 + s_2 + \ldots s_{i-1} + s_i + p_i \equiv 0 \pmod{a_{i+1}}
$$

and since each \\(s_i=c_ia_i\\), we can rewrite the above as:

$$
\begin{equation}
c_1a_1 + c_2a_2 + \ldots c_{i-1}a_{i-1} + c_ia_i + p_i \equiv 0 \pmod{a_{i+1}}
\end{equation}
$$

Recall that since we have chosen an order of structure members that goes from largest alignment to
smallest alignment, we also have:

$$
a_1 \geq a_2 \geq a_3 \geq \ldots \geq a_{i-1} \geq a_i \geq a_{i+1}
$$

And since each alignment is a power of two, we know that \\(a_{i+1}\\) must evenly divide 
\\(c_1a_1 + c_2a_2 + \ldots c_{i-1}a_{i-1} + c_ia_i\\). Putting this together with equation (24)
we immediately know that:

$$
p_i \equiv 0 \pmod{a_{i+1}}
$$

and we are done, as \\(p_i=0\\) by our constraints on \\(p_i\\). <span class="qed">\\(\blacksquare\\)</span>

<details>
<summary>On minimizing structure size on ternary computers</summary>
<p>
Notice that, in the above proof, the fact that each \(a_i\) was a power of 2 didn't play any particularly
important role, besides ensuring that \(a_i\) evenly divides by \(a_j\) if \(i \geq j\). 
</p>
<p>
Assuming a hypothetical ternary computer follows similar rules for alignment as today's binary
computers, that seems to imply that the above lemma would be true even if each \(a_i=3^{k_i}\) 
for some positive \(k_i\). In other words, on such a ternary computer ordering the members of a
structure from largest to smallest alignment would minimize \(\text{dsizeof}(S,M)\).
</p>

<p>
In fact, we could extrapolate that the above lemma would be true as long as each \(a_i=b^{k_i}\)
for some base \(b\), and so ordering the members of a primitive structure aligned on \(a_\text{max}\) 
from largest to smallest alignment would minimize the size even on computers based on powers of \(b\).
</p>
</details>

### Ordering members of a primitive structure by alignment minimizes sizeof 

With **Lemma 3** in our belt, proving that ordering structure members of a primitive structure by alignment will minimize `sizeof`
becomes significantly easier. 

**Lemma 4:** Let \\(S\\) be a primitive structure aligned on \\(a_\text{max}\\), the largest alignment in \\(S\\). 
Ordering the members of \\(S\\) from largest to smallest alignment will minimize the value of \\(\text{sizeof}(S, M)\\).

**Proof:** Let \\(S_\alpha\\) be the structure formed from taking the members of \\(S\\) and
ordering them from the largest to smallest alignment, and let \\(S_\beta\\) be the structure formed from
any permutation of the members of \\(S\\). We wish to prove that: 

$$\text{sizeof}(S_\alpha, M) \leq \text{sizeof}(S_\beta, M)$$

Expanding the definition of \\(\text{sizeof}\\), we know that:

$$
\begin{align}
\text{sizeof}(S_\alpha,M) = \text{dsizeof}(S_\alpha,M) + p_\alpha \\\\
\text{sizeof}(S_\beta,M) = \text{dsizeof}(S_\beta,M) + p_\beta
\end{align}
$$

Furthermore, by our constraints on the tail padding \\(p_\alpha\\), we know that:

$$
\begin{align}
M + \text{dsizeof}(S_\alpha,M) + p_\alpha \equiv 0 \pmod{a_\text{max}} \\\\
\text{dsizeof}(S_\alpha,M) + p_\alpha \equiv 0 \pmod{a_\text{max}} \\\\
\end{align}
$$

However, if we notice the lefthand side of equation (28) is just the definition of \\(\text{sizeof}(S_\alpha, M)\\), we
know that:

$$
\text{sizeof}(S_\alpha, M) \equiv 0 \pmod{a_\text{max}}
$$

And in particular, it means that \\(\text{sizeof}(S_\alpha,M) = c_{\alpha}a_\text{max}\\) for some positive integer 
\\(c_\alpha\\). By a similar argument, we can conclude that \\(\text{sizeof}(S_\beta,M) = c_{\beta}a_\text{max}\\) for
some positive integer \\(c_\beta\\).

However, recall that \\(0 \leq p_\alpha \lt a_\text{max}\\), and \\(0 \leq p_\beta \lt
a_\text{max}\\). We can put this information together with equation (28) to notice that:

$$
\begin{equation}
(c_{\alpha} - 1)a_\text{max} \lt \text{dsizeof}(S_\alpha, M) \leq c_{\alpha}a_\text{max}
\end{equation}
$$

and we can copy-paste that argument to come to a similar conclusion about \\(\text{dsizeof}(S_\beta,
M)\\):

$$
\begin{equation}
(c_{\beta} - 1)a_\text{max} \lt \text{dsizeof}(S_\beta, M) \leq c_{\beta}a_\text{max}
\end{equation}
$$

By **Lemma 3**, we know that \\(\text{dsizeof}(S_\alpha, M) \leq \text{dsizeof}(S_\beta, M)\\), and if
we put that together with equations (29) and (30) we know that:

$$
\begin{gather}
(c_{\alpha} - 1)a_\text{max} \lt \text{dsizeof}(S_\alpha, M) \leq \text{dsizeof}(S_\beta, M) \leq c_{\beta}a_\text{max} \\\\
(c_{\alpha} - 1)a_\text{max} \lt c_{\beta}a_\text{max} \\\\
(c_{\alpha} - 1) \lt c_{\beta}
\end{gather}
$$

And since \\(c_{\alpha}\\) is the smallest integer greater than \\(c_{\alpha} - 1\\), we in particular
have that \\(c_{\alpha} \leq c_{\beta}\\). Thus:

$$
\text{sizeof}(S_\alpha,M) = c_{\alpha}a_\text{max} \leq c_{\beta}a_\text{max} =
\text{sizeof}(S_\beta,M)
$$

and we are done with the proof. <span class="qed">\\(\blacksquare\\)</span>

### What other structures can be classified as primitive structures?

Remember that our only requirement for a structure to be a primitive structure is that
all members \\(m_i\\) satisfy \\(s_i = ca_i\\) for some \\(c \geq 0\\).

If a member is a primitive data type, these conditions are surely true. But these conditions also
hold if a structure member is a structure itself. This is because the starting address of a
structure \\(S\\) is always some multiple of \\(a_\text{max}\\), and since we choose trailing
padding for the structure so that the structure ends on a multiple of \\(a_\text{max}\\), the
difference between the starting and ending memory addresses of \\(S\\) reveals that the size of
\\(S\\) is also a multiple of \\(a_\text{max}\\). 

The above conditions also hold true if a structure member is a fixed length array of primitive
members. This is because the alignment of the array is just the alignment of the primitive member
itself, and the size of the array is just a multiple of the size of the primitive member.

In other words, **Lemma 4** is applicable to a wider variety of structures than just those whose
members are primitive data types.

### Counterexample to the 'ordering by alignment' algorithm

It's easy to generate a counter example for why the 'ordering by alignment' algorithm doesn't always
minimize the size of a structure. For example, consider the following structure on a 32-bit system:

```c
struct Foo {
    __attribute__((aligned(8))) int someInt;
    __attribute__((aligned(8))) double someDouble;
    short someShort;
}

```

It is clear that the members are sorted by alignment, but we can find a layout of `Foo` that is
smaller than the layout found previously:

```c
struct Foo {
    __attribute__((aligned(8))) int someInt;
    short someShort;
    __attribute__((aligned(8))) double someDouble;
}
```

You can try [both of these examples on Godbolt](https://godbolt.org/#g:!((g:!((g:!((h:codeEditor,i:(filename:'1',fontScale:14,fontUsePx:'0',j:1,lang:___c,selection:(endColumn:1,endLineNumber:20,positionColumn:1,positionLineNumber:20,selectionStartColumn:1,selectionStartLineNumber:1,startColumn:1,startLineNumber:1),source:'%23include+%3Cstdio.h%3E%0A%0Astruct+FooInefficient+%7B%0A++++__attribute__((aligned(8)))+int+someInt%3B%0A++++__attribute__((aligned(8)))+double+someDouble%3B%0A++++short+someShort%3B%0A%7D%3B%0A%0Astruct+Foo+%7B%0A++++__attribute__((aligned(8)))+int+someInt%3B%0A++++short+someShort%3B%0A++++__attribute__((aligned(8)))+double+someDouble%3B%0A%7D%3B%0A%0Aint+main(void)+%7B%0A++++printf(%22Size+of+FooInefficient:+%25zu%5Cn%22,+sizeof(struct+FooInefficient))%3B%0A++++printf(%22Size+of+Foo:+%25zu%5Cn%22,+sizeof(struct+Foo))%3B%0A++++return+0%3B%0A%7D%0A'),l:'5',n:'0',o:'C+source+%231',t:'0')),k:45.36247334754797,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cclang2010,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:1,lang:___c,libs:!(),options:'',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+clang+20.1.0+(C,+Editor+%231)',t:'0')),header:(),k:26.22601279317697,l:'4',n:'0',o:'',s:0,t:'0'),(g:!((h:executor,i:(argsPanelShown:'1',compilationPanelShown:'0',compiler:cclang2010,compilerName:'',compilerOutShown:'0',execArgs:'',execStdin:'',fontScale:14,fontUsePx:'0',j:2,lang:___c,libs:!(),options:'-m32',overrides:!(),runtimeTools:!(),source:1,stdinPanelShown:'1',wrap:'1'),l:'5',n:'0',o:'Executor+x86-64+clang+20.1.0+(C,+Editor+%231)',t:'0')),header:(),k:28.411513859275054,l:'4',n:'0',o:'',s:0,t:'0')),l:'2',n:'0',o:'',t:'0')),version:4).

This might imply that some kind of "gap-filling" algorithm would always give the optimal output.
However, you have to be careful here - it is possible that "filling the gap" earlier might result in
an unfillable gap later that's larger than the gap we were trying to fill. Clang attempts to write
an algorithm like this, and while it's mostly correct, we can still find structures where it fails
to find the optimal size.

## Counterexample to Clang's optin.performance.Padding Analyzer

As mentioned before, Clang comes with an [optional analyzer that will attempt to check for
excessively padded structures](https://clang.llvm.org/docs/analyzer/checkers.html#optin-performance-padding).
The comments in the [optin.performance.Padding implementation](https://github.com/llvm/llvm-project/blob/main/clang/lib/StaticAnalyzer/Checkers/PaddingChecker.cpp#L230) 
gives us hints at what it tries to do.

First, here is the promised counterexample on x86-64. The construction is admittedly contrived, and I'm not
sure if there are any real life structures that would have a shape similar to it. In
any case, we know that Clang's algorithm is not always correct (but is probably good enough for the
vast majority of usecases).

I tried to get the static checkers working in Godbolt, but failed to for some reason. 
So I hope you'll be willing to try this on your own machine.

```c
#include <stdint.h>
#include <stdio.h>

struct Foo {
    __attribute__((aligned(8))) uint32_t id;
    __attribute__((aligned(8))) uint8_t flags[9];
    struct {
        uint16_t foo;
        uint16_t bar;
        uint16_t blah;
    };
};

struct FooInefficient {
    __attribute__((aligned(8))) uint32_t id;
    struct {
        uint16_t foo;
        uint16_t bar;
        uint16_t blah;
    };
    __attribute__((aligned(8))) uint8_t flags[9];
};

// Clearly "inefficient" structure to test that clang's
// static analyzer is running at all.
struct Baz {
    char firstChar;
    double firstDouble;
    char secondChar;
};

int main(void) {
    printf("Size of struct Foo: %zu\n", sizeof(struct Foo));
    printf("Size of struct FooInefficient: %zu\n", sizeof(struct FooInefficient));
}
```

To run the `clang` padding checker, you can invoke the following command, assuming you copied the
above code into the file `main.c`:

```shell
clang --analyze -Xclang -analyzer-checker=optin.performance.Padding -Xclang -analyzer-config -Xclang optin.performance.Padding:AllowedPad=0  main.c
```

On my x86-64 machine, when using clang version 20.1.8, notice how there are only warnings for the structure `Baz`, and none for `FooInefficient`: 

```shell
$ clang --analyze -Xclang -analyzer-checker=optin.performance.Padding -Xclang -analyzer-config -Xclang optin.performance.Padding:AllowedPad=0  main.c
main.c:24:8: warning: Excessive padding in 'struct Baz' (14 padding bytes, where 6 is optimal). Optimal fields order: firstDouble, firstChar, secondChar, consider reordering the fields or adding explicit padding members [optin.performance.Padding]
   24 | struct Baz {
      | ~~~~~~~^~~~~
   25 |     char firstChar;
      |     ~~~~~~~~~~~~~~~
   26 |     double firstDouble;
      |     ~~~~~~~~~~~~~~~~~~~
   27 |     char secondChar;
      |     ~~~~~~~~~~~~~~~~
   28 | };
      | ~
1 warning generated.
```

However, if you run the compiled binary, we can see that `FooInefficient` is clearly larger than `Foo`, and
the static analyzer did not realize that there existed a smaller layout for `FooInefficient`:

```shell
$ ./a.out
Size of struct Foo: 24
Size of struct FooInefficient: 32
```

## Further Questions

There were a couple of interesting questions to explore, but I decided against including them in
this blog post as it was already getting long.

### Ability of other field reordering algorithms to minimize size

While we gave a counterexample to the correctness of Clang's algorithm, it would be interesting to
mathematically characterize a group of structures where Clang's algorithm can always minimize their
size. It would be interesting to try and analyze the algorithm of `pahole` as well, although I
vaguely remember it not accounting for `alignas` specifiers (you should double check, I could be
remembering incorrectly).

Furthermore, the problem of reordering field members to minimize size is clearly not unique to C.
It would be interesting to:

- Analyze the ability of [Java's layout algorithm](https://github.com/openjdk/jdk/blob/master/src/hotspot/share/classfile/fieldLayoutBuilder.cpp) to minimize size
  - There is a [thorough writeup about this in Oracle's Java Bug Database](https://bugs.java.com/bugdatabase/view_bug.do?bug_id=JDK-8237767) if you're curious.
  - As mentioned earlier, it seems like most research into Java layout organization seems to favor layouts that are friendly to the access patterns of the program. 
    This is probably better for performance than purely trying to minimize size, and so perhaps this
    line of questioning isn't useful.
- Analyze the ability of [Rust's layout algorithm](https://github.com/rust-lang/rust/blob/master/compiler/rustc_abi/src/layout.rs) to minimize size
  - Again, there is a [thorough writeup about this by Austin Hicks](https://camlorn.net/posts/April%202017/rust-struct-field-reordering/) if you're curious (although probably a bit outdated).
- Try to come up with a layout algorithm for C++ classes, and characterize what kind of data
  structures it will create an optimal layout for. 
  - This might be trivial to do once we know how to optimize a C structure layout, but I don't
    really know enough about the memory layout of C++ classes to say.

### Usefulness of memory allocators flexible enough to allocate memory at exotic alignments

Earlier, we noticed that there are other valid alignments for a structure \\(S\\) that is not just \\(a_\text{max}\\). 
In particular, in our discussion in ["A potential ambiguity in the definition of sizeof"](#a-potential-ambiguity-in-the-definition-of-sizeof), we saw 
that a given layout of `Foo` could be denser depending on what memory address we started it out on. 

It turned out to not be useful in that case because we found a layout of `Foo` that was just as
dense at \\(M \equiv 0 \pmod{4}\\) as the initial layout of `Foo` was at \\(M \equiv 2
\pmod{4}\\). However, this begs another question.

Suppose that a structure \\(S\\) has "valid alignments" at both memory addresses \\(M_\alpha\\) and
\\(M_\beta\\) such that:

$$
\begin{gather*}
M_\alpha \equiv 0 \pmod{a_\text{max}} \\\\
M_\beta \equiv b \pmod{c}
\end{gather*}
$$

for some positive integers \\(b\\) and \\(c\\). Is it true that the minimal size that we
could find when starting \\(S\\) at \\(M_\alpha\\) is equal to the minimal size that we could find
when starting \\(S\\) at \\(M_\beta\\)? Can we ever find denser/smaller layouts of \\(S\\) at
\\(M_\beta\\) than we could at \\(M_\alpha\\)?

The answer to the above question might have interesting implications on how flexible memory
allocator implementations should be!
