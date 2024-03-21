---
title: Inspecting LLVM inlining decisions with LLVM logging
description: Enabling LLVM debug messages to get more visibility into why LLVM is inlining a function.
date: 2024-03-20
isTodayLearned: true
tags:
  - Compilers
layout: layouts/post.njk
---

I was curious about how LLVM makes decisions on whether to inline a function or not, and wanted to
get a high level overview of its strategy. Thankfully, it seems like there is some relevant
logging in [`InlineCost.cpp`](https://github.com/llvm/llvm-project/blob/0c423af59c971ddf1aa12d94529edf8293608157/llvm/lib/Analysis/InlineCost.cpp) that we can take advantage of!

All we have to do is compile Clang in debug mode, then invoke clang with the arguments
`-mllvm -debug`. All this does is pass the `-debug` flag to the `llvm` backend, which enables
logging statements for us.

For example, if we wanted to analyze why the function `foo` may or may not be inlined below:

```c
#include <stdio.h>
#include <stdlib.h>

int foo(int a) {
    if (a < 10) return 5;

    for (int i = 0; i < a; i++) {
        printf("%u ", i);
    }
    puts("");
    puts("");
    puts("");
    puts("");
    return 0;
}

int main(int argc, char** argv) {
    if (argc < 2) {
        puts("Please enter an integer.");
    }
    // You'll want error handling in a real application here,
    // but for simplicity we're omitting it.
    int i = strtol(argv[1], 0, 10);
    return foo(i);  
}
```

We would invoke `clang main.c -mllvm -debug -O2` and look at the outputted logs. Here are the 
interesting log lines after redirecting the logs to a file:

```shell
  Initial cost: -35
  NumConstantArgs: 0
  NumConstantOffsetPtrArgs: 0
  NumAllocaArgs: 0
  NumConstantPtrCmps: 0
  NumConstantPtrDiffs: 0
  NumInstructionsSimplified: 4
  NumInstructions: 14
  SROACostSavings: 0
  SROACostSavingsLost: 0
  LoadEliminationCost: 0
  ContainsNoDuplicateCall: 0
  Cost: 170
  Threshold: 225
Inlining (cost=170, threshold=225), Call:   %call2 = call i32 @foo(i32 noundef %conv), !range !9
```

Note that the `-debug` argument won't work if `clang` is not compiled in debug mode.
