---
title: Storage of Compound Literals in C
description: Attempting to go through the C Working Group documents to find out why compound literals are the way they are.
date: 2024-03-13
isTodayLearned: true
tags:
  - C Programming
layout: layouts/post.njk
---

Some subtle details about compound literals confused me while going through
<cite>Modern C</cite>. For example, what do you think will be returned if we
compile and run the following code?

```c
struct foo { int i; };

int main (void)
{
    struct foo* p = 0, *q;
    int j;

    for (j = 0; j < 2; j++)
        q = p, p = &((struct foo){ j });
    return p == q;
}
```

If you read the code, you might assume that this will return 0, since `q` should
always be pointing to the "old" value of `p` at the end of each loop, right?

It turns out that `main` will always return 1, and the C standard offers some
clarification about what is going on here.

<table-of-contents></table-of-contents>

## What is going on?

If we look at the [C23 standard (PDF)](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n3096.pdf),
section 6.5.2.5p17 has the following to say:

<blockquote>
<p><b>EXAMPLE 9:</b> Each compound literal creates only a single object in a given scope.</p>
</blockquote>

In other words, since we only have a single compound literal expression in the code snippet
above, we only allocate space for one `struct foo` when we enter `main`. As we go through the for loop, each `foo` we
initialize is placed into the same address, no matter what `j` we initialize it with. This is
because all of the structures we initialize share the same block scope and come from the same
expression.

Thus, the
two pointers share the same address at the end of `main`, and we return 1.

## Looking at the LLVM IR

If you aren't already aware, [LLVM IR](https://llvm.org/docs/LangRef.html) is a very convenient way to represent assembly in an
architecture independent way. Here is an annotated output of compiling the above file with
optimization level 0:

```llvm
%struct.foo = type { i32 }

; Function Attrs: noinline nounwind optnone uwtable
define dso_local i32 @main() #0 {
  %1 = alloca i32, align 4
  %2 = alloca %struct.foo*, align 8             ; struct foo* p
  %3 = alloca %struct.foo*, align 8             ; struct foo* q
  %4 = alloca i32, align 4                      ; int j
  %5 = alloca %struct.foo, align 4              ; Compound literal address
  store i32 0, i32* %1, align 4
  store %struct.foo* null, %struct.foo** %2, align 8
  store i32 0, i32* %4, align 4
  br label %6

6:                                                ; preds = %13, %0
  %7 = load i32, i32* %4, align 4
  %8 = icmp slt i32 %7, 2
  br i1 %8, label %9, label %16

9:                                                ; preds = %6
  %10 = load %struct.foo*, %struct.foo** %2, align 8
  store %struct.foo* %10, %struct.foo** %3, align 8
  %11 = getelementptr inbounds %struct.foo, %struct.foo* %5, i32 0, i32 0
  %12 = load i32, i32* %4, align 4
  store i32 %12, i32* %11, align 4
  store %struct.foo* %5, %struct.foo** %2, align 8
  br label %13

13:                                               ; preds = %9
  %14 = load i32, i32* %4, align 4
  %15 = add nsw i32 %14, 1
  store i32 %15, i32* %4, align 4
  br label %6, !llvm.loop !6

16:                                               ; preds = %6
  %17 = load %struct.foo*, %struct.foo** %2, align 8
  %18 = load %struct.foo*, %struct.foo** %3, align 8
  %19 = icmp eq %struct.foo* %17, %18
  %20 = zext i1 %19 to i32
  ret i32 %20
}
```

If you take the time to read the code, you'll notice that `%5` holds a pointer to a `struct foo`.
In other words, that register holds the memory allocated for our compound literal.

The body of the for loop is represented by `label 9`, where we repeatedly update the integer in `%5`.
We are not seeing multiple `alloca` calls to initialize a new compound literal in the loop, which
tracks with what the C23 standard says should happen.

Interestingly, it turns out that compiling the same code with `-O2` instead of `-O0` is enough for `clang` to give this extremely
simplified output!

```llvm
; Function Attrs: nofree norecurse nosync nounwind readnone uwtable
define dso_local i32 @main() local_unnamed_addr #0 {
  ret i32 1
}
```

This is probably expected, but I still think it's cool that the compiler is
smart enough to take all of the code above and simplify it to this small little chunk 🙂

<details>
<summary>Don't know how to read LLVM IR?</summary>
<p>
That's okay - I don't know much about it either.
</p>
<p>
I used <a href="https://www.youtube.com/watch?v=m8G_S5LwlTo&t=1785s">this conference talk</a> to get the basics down,
at least enough to somewhat understand the emitted code above. I personally found it to be a very gentle introduction.
</p>
<p>
Afterwards, searching for instructions that I didn't know about and taking some time to read about it
in the <a href="https://llvm.org/docs/ProgrammersManual.html">LLVM Programmer's Manual</a> was very helpful to me.
</p>
</details>

## Why was this behavior chosen?

I attempted to go through the [WG 14 documents](https://www.open-std.org/jtc1/sc22/wg14/www/wg14_document_log.htm) to find the answer. After doing some digging, I found
that the first time this was brought up was in [N759](https://www.open-std.org/jtc1/sc22/wg14/www/docs/n759.htm), which brought up an issue with the C99
standard. It seems that this behavior was chosen because the alternative would introduce complexity
for implementers:

<blockquote>
<p>Consider the situation where a compound literal is evaluated more than once
during the lifetime of its block, such as the second compound literal in
example 8. The wording is unclear whether a new object is created each time
the compound literal is evaluated, or whether a single object is simply
reinitialized. If the former is the case, a burden will be placed on
implementations, which will now have to handle dynamic allocation with
block-related lifetime.</p>
</blockquote>
