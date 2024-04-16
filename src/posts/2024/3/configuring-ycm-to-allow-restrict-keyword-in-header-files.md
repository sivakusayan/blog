---
title: Configuring YCM to allow the restrict keyword in header files
description: Configuring YCM to allow the restrict keyword in C header files.
date: 2024-03-22
isTodayLearned: true
tags:
  - C Programming
layout: layouts/post.njk
---

When doing some C development earlier today, I noticed I was getting a very particular error in vim.
Given a simple header file like this:

```c
struct Foo {
    int* restrict ptr;
};
```

[YCM](https://github.com/ycm-core/YouCompleteMe) would give an error saying `[expected_semi_decl_list] Line 2: expected ';' at end of declaration list`, even though this is perfectly valid C.

The reason this happened is because my configuration of YCM was using [`clangd`](https://clangd.llvm.org) for parsing the code, and there was no `.clangd` file specifying what types of files were in this project. Because both C and C++ have header files, `clangd` guessed that the header file was a C++ header file.

C++ doesn't have the `restrict` keyword, and so it throws the error above. The fix is simple: make a `.clangd` configuration file at the root of your project,
and then tell `clangd` that we are writing in C. Something like this should do it:

```yaml
CompileFlags:
  Add: [-xc]
```
