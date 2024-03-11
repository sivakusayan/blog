---
title: On anxiety and becoming a better software engineer
description: My thoughts on imposter syndrome, developer culture, and where I want to be in the future.
date: 2023-07-24
tags:
  - Career
layout: layouts/post.njk
---

<b>FYI, this is a somewhat unintelligible stream of thoughts that have been bothering me over the past year.</b>

I've recently been thinking a lot about whether I am a "good" or "bad" developer, to the point where it was probably a bit unhealthy. Ever since I started contributing to open source and doing things that are traditionally associated with "hacker culture", I've started to realize how much there is to know.

This is something that <em>every</em> long-time developer says, but I think this is one of those things that you don't truly understand until you come to that conclusion through your own experiences, instead of someone else's.

## There is a plethora of talent out there.

The more you immerse yourself in developer culture, the more you realize just how much talent there is in this space.

- There are developers that have been coding since they were in middle school, high school, or similar.
- There are developers that formally studied computer science in top-tier colleges and have done cool professional work, whether that be through internships or research or similar.
- There are developers with amazing design skills that make breathtakingly beautiful and usable software, all without the help of a UX designer.

I could go on. A lot of these developers don't realize how strong they are, because what they know is so normal to them.

In comparison:

- I only started to learn how to program in my senior year of college, mostly teaching myself with Udemy courses.
- I have a mathematics degree from an average college instead of a computer science degree. I did not have cool opportunities to apply my knowledge.
- I don't have great design skills (there is a reason why I made my website so minimal).

It's only recently I've started recognizing the gaps I have when compared to people in the former group.

## Self taught developers later in life tend to be at a disadvantage.

There seems to be a growing pattern of people saying that you don't need a degree to be a developer. I agree with this to a point - anything you can learn in college you can learn on your own with enough effort.

However, there is a practicality aspect to this. If you're learning how to code after college, you don't have as much free time as you might have had when you were younger. Depending on what kind of programming you want to do, the amount of investment you need to put in can go from approachable to absolutely intimidating.

If you primarily code with <a href="https://learn.microsoft.com/en-us/dotnet/standard/managed-code">managed languages</a>, I think this becomes much easier. There are a plenty of Udemy courses and Medium articles which will teach you to, at the very least, be a decent developer with those tools. You don't need to have indepth knowledge of how a computer works under the hood in order to do cool things, or know anything fancy that a computer science student might study. There are abstractions in place that will make sure you don't have to think about what's truly going on behind the scenes.

If you start to do work with unmanaged code, however, the amount of knowledge you need to not shoot yourself in the foot goes up exponentially. For example, I wish that I:

- Had a better knowledge of the kinds of things computers do under the hood.
- Had a better knowledge of how compilers work.
- Had a better knowledge of assembly code so I could see what the disassembly of my code does.
- Had a better knowledge of how to leverage the advantages I get with lower-level languages that I can't get with a higher-level language.

Among many other things. There aren't pretty and easily digestible Udemy courses or Medium articles for topics like this, at least for anything that is non-trivial, which is understandable as this knowledge tends to be more academic.

I especially feel these pain points since I've started contributing to Chromium - I've never thought about the performance and memory implications of the code I write so much before, even for the easiest of fixes. While I think I'm doing OK so far, it's definitely very intimidating for me.

## It's ok to take your time.

The thoughts that I've listed above made me feel like I needed to rush to "catch up" with my peers. I wanted to obtain the knowledge that I missed out on so I can do the type of work I want to do. This has caused a lot of stress for me in the past year or so.

Reading the article <a href="https://norvig.com/21-days.html">Teach Yourself Programming in Ten Years</a> has helped me come to terms with the fact that it will take a long time for me to get to a place I am happy with, and that's okay. There's no need to be in a race with anyone, and there will always be someone that is smarter than you anyway.

It's not realistic to expect yourself to be a very good engineer within 2 or 3 years. As long as I move slowly towards my goal, that is enough for me.

## It's ok to make mistakes.

I'm a perfectionist, which isn't always a good thing. It means that I sometimes move slower than necessary, and also means that I can beat myself up pretty hard whenever I make a mistake.

Since we're human, we're naturally going to have buggy code. We can invest in tooling that can minimize these bugs, but bugs are just a fact of life. When we make a mistake, the most we can do is figure out why that bug was let through, fix it, and make sure tests are in place so that the bug doesn't appear again. Maybe hold a post-mortem if the bug was extremely bad, too.

I know that I've made my share of mistakes. My most recent one came from my implementation of enabling <code>aria-errormessage</code> to point to multiple <code>HTMLElements</code>. The crux of the Windows-only bug is that the order that accessibility nodes are returned in the accessibility API isn't always the same as the order specified in the HTML. In fact, this is true for all ARIA attributes that point to multiple HTMLElements except <code>aria-labelledby</code> and <code>aria-describedby</code> <em>(if you're curious, the array we return is sorted by when we created the accessibility node)</em>.

I'm still not sure how I didn't catch it while I was testing, given that:

- I'm an extremely paranoid person and look at my patches with a lot of scrutiny out of fear of breaking something.
- I updated a fair amount of integration tests, added new integration tests, and even improved the <a href="https://chromium.googlesource.com/chromium/src/+/HEAD/content/test/data/accessibility/readme.md">dump tree testing</a> code to make it more airtight when it comes to changes like this.

Thankfully, this bug shouldn't be breaking anything since:

- The code I submitted is implementing a new feature of ARIA, so websites shouldn't be using it in production right now.
- At most, it causes error messages to be read in the wrong order, which while confusing <em>probably</em> isn't a blocker.
- I caught it in Chrome Canary.

Oh well, I released a buggy implementation - I'll commit a fix for it and learn from this.

This likely won't be the last time I release buggy code. Even the most talented software engineers can write buggy code at times <em>(even if they write less bugs than other developers)</em>! As long as I learn from my mistakes and put in the necessary tests/tools to make sure it doesn't happen again, I think I'll be able to live with myself.

It's part of being human.

## You don't have to be the best.

This might be obvious to most of you, but as someone who grew up as <a href="https://www.mindbodygreen.com/articles/golden-child-syndrome">the golden child</a> in an Asian household, this took a long time for me to accept. I'm still working on accepting this now.

I do development because I enjoy making software that improves peoples' lives. It's a big reason why I got into accessibility.
I don't need to be the best engineer in my field, or even on my team, to do that. I don't need to be the best engineer to lead a happy life - there are other things that can do that for me, like friends and family.

For me, I want to be better because that will reflect in better software for the people who need it. It doesn't matter if someone else is better than me as long as I'm slightly better than I was yesterday.

Most importantly, I think that being average isn't a bad thing. Being average is underrated, I think. Maybe the secret to happiness is not tying so much of your self worth with your career.

## Helpful resources

Some resources I found helpful while thinking through all of this for the past few months.

- <a href="https://www.youtube.com/watch?v=-Afvtij-o2w&t=0s&ab_channel=bigboxSWE"> Software Engineering Anxiety</a>
- <a href="https://norvig.com/21-days.html">Teach Yourself Programming in Ten Years</a>
- <a href="https://daedtech.com/how-developers-stop-learning-rise-of-the-expert-beginner/">How developers stop learning: Rise of the expert beginner</a>

I especially appreciate my friends who put up with me ranting about how I feel like a bad engineer. I'm happy and really lucky that I have wonderful friends like you all&nbsp;🙂.

If you don't have friends that you can rant about this to, I hope that you can, at the very least, tell yourself the same things I told myself in this post. Even if not now, eventually.
