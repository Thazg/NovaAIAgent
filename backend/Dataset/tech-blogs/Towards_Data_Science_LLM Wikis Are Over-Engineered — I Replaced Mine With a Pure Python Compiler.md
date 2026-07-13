Title: LLM Wikis Are Over-Engineered — I Replaced Mine With a Pure Python Compiler

URL Source: https://towardsdatascience.com/llm-wikis-are-over-engineered-i-replaced-mine-with-a-pure-python-compiler/

Published Time: 2026-07-03T13:30:00+00:00

Markdown Content:
## TL;DR

*   I pipeline that compiles a folder of raw, messy text notes into a linked, linted markdown wiki. No LLM calls, no embeddings, no external APIs, standard library only.
*   The pipeline has four stages: a regex extractor, a graph builder that detects cross-references, a section-aware rewriter that preserves anything you write by hand, and a linter that checks its own output.
*   I hit two real bugs while building this: a graph builder that scaled badly, and a linter that silently undercounted orphan pages. Both are in this article as they actually happened, along with the fixes.
*   I benchmarked the full pipeline at three corpus sizes on two different machines (Linux and Windows) and checked whether the deterministic outputs actually matched across both. They did, exactly.
*   Full code, all 17 tests, and unrounded terminal output are included below so you can rerun everything yourself.

## Why I wrote this

I tried building a Karpathy-style LLM wiki. Agent loops. Recursive LLM calls. Embeddings for everything.

The input was a folder of local markdown files I already had, sitting on my own disk.

And partway through, it hit me: I was paying tokens to reorganize text I already owned.

So I replaced the entire pipeline with a pure Python compiler.

This article walks through that system in full: turn a folder of raw, inconsistently formatted text notes into a linked, linted markdown wiki, with zero LLM calls, zero external APIs, and zero third-party dependencies. Every benchmark number below is real, was run on two different machines (a Linux container and my own Windows PC), and I’ve included the two real bugs I hit while building it.

If you’re searching for a pure Python markdown wiki compiler, a deterministic alternative to agent-based knowledge base tools, or a practical breakdown of building a local-first RAG alternative, this is that article.

> **Complete code: [https://github.com/Emmimal/wiki-compiler/](https://github.com/Emmimal/wiki-compiler/)**

## The compiler mindset

Here’s the reframe that the rest of this article is built on:

An agent decides what your wiki might look like. A compiler guarantees what it must look like.

[![Image 1: Diagram comparing the stochastic nature of an Agent pipeline with the deterministic nature of a Compiler pipeline. The Agent pipeline flows through LLMs and rewrites, while the Compiler pipeline flows through a parser, graph, and rewrite process.](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/Agent-pipeline-vs-Compiler-pipeline-1024x636.png)](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/Agent-pipeline-vs-Compiler-pipeline-scaled.png)

Stochastic Agent pipelines versus deterministic Compiler pipelines. While Agentic workflows introduce variability through iterative LLM calls, Compiler-based architectures provide consistent, reproducible outputs. Image by Author

I wanted this wiki to be predictable. Unlike an LLM which varies its output, a compiler gives you the same result every single time you run it. That consistency is essential for my personal reference notes. I have structured this system so that markdown pages act like object files. They are generated from source and can be rebuilt at will. I keep the hand-edited content separate from the machine-generated sections. Here is how the pipeline is set up:

[![Image 2: A vertical flowchart detailing "The Compile Pipeline," showing a 5-stage automated data pipeline that transforms unorganized raw markdown notes into a structured, validated, and fully linked personal wiki.](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/THE-COMPILE-PIPELINE-915x1024.png)](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/THE-COMPILE-PIPELINE.png)

The step-by-step system architecture of the Markdown compilation pipeline, mapping out the automated extraction, link graph generation, section rewriting, and structural linting phases. Image by Author

I broke this down into four stages. Each one handles a single deterministic task and can be tested on its own. I avoided any step that relies on a model to make a judgment call.

### Why zero dependencies matters here, specifically

Everything in this codebase runs on the Python standard library alone. No `sentence-transformers`, no vector database, no HTTP client for an embedding API. That’s not a purity test for its own sake. It’s a direct consequence of the problem this pipeline solves.

Once you strip away the LLM calls, what’s actually left to do is text parsing, string manipulation, and graph traversal over an in-memory dictionary. Those are exactly the kinds of problems `re`, `os`, and plain Python data structures were built for. Reaching for a heavier dependency here wouldn’t buy correctness, it would just buy install friction and one more thing that can break for reasons that have nothing to do with your actual notes. If you’ve ever had a `pip install` hang on Windows because a compiled wheel for a machine learning library wasn’t available for your Python version, you already know why “it just runs” is worth protecting.

## The problem with agent-driven wikis

The idea of using an LLM to build and maintain a personal wiki isn’t new, and it isn’t mine. It gained serious traction after Andrej Karpathy described the pattern in a widely shared post, where he explained that he was spending less of his token budget generating code and more of it building structured, persistent knowledge bases out of his research notes. He followed up with a public “idea file” laying out the architecture in more depth, and explicitly compared the process to compilation: raw sources go in, a structured, cross-referenced wiki comes out, and the LLM is the thing doing the compiling [1][2].

I think that compilation framing is exactly right. I just don’t think an LLM needs to be the compiler.

Here’s the practical problem. If your raw source is already local, already text, and already deterministic, routing it through a probabilistic system to organize it introduces three costs that a parser or a compiler simply doesn’t have:

**Cost**: Every time you add a new document, an agent-driven wiki re-reads content, decides what changed, and rewrites pages. That’s token spend on organizational work, not synthesis. It adds up fast once your source folder has hundreds of files instead of a dozen.

**Latency**: Every read-decide-write cycle is a network round trip if you’re using a hosted model, and a real compute cost even if you’re running something local. For work that’s fundamentally about restructuring existing text, that latency has no reason to exist.

**Non-determinism**: This is the one that actually bit me. I ran the same folder through an early agent-based prototype twice and got two different link structures. Nothing had changed in the source files. The model just made slightly different judgment calls both times about what counted as related. For code, that’s occasionally charming. For the thing you’re using as your source of truth, it’s a problem.

None of this means LLMs are the wrong tool for knowledge work in general. It means they’re the wrong tool for the specific part of the job that’s actually deterministic: taking known inputs and producing a known, reproducible structure. That part is a parsing problem, not a reasoning problem.

## Step 1: The regex metadata extractor

Real note folders are a mess. Some files use a # Header, some use a bare uppercase line, and some have no header at all. Metadata like “created:” or “aliases:” might be missing, or hidden in the middle of the file. Any extractor expecting consistent formatting breaks the moment it hits a real-world file, so I built mine to handle the mess.

It checks for a # header first. If that fails, it looks for a bare capitalized line. If it still finds nothing, it defaults to the filename. It scans for metadata fields wherever they happen to exist rather than requiring them to be in a specific spot.

This means the pipeline doesn’t crash on a malformed note; it just works with what it finds. It is the most boring part of the project, but it cleans up the bulk of the mess, which is why I spent the most time getting this stage to actually hold up.

## Step 2: The Graph Builder

This stage handles the links between notes. I hit a performance wall here.

My first version ran a separate regex for every entity against every other file. It was an `O(n^2)` approach. With 100 files, it was fine. With 1,000 files, it took 4.4 seconds. At 5,000 files, it took 107 seconds. I had assumed that not calling an API meant the code would be fast by default. I was wrong. The algorithm matters more than the lack of network calls.

I replaced the pairwise regex matching with a word-indexed phrase matcher. Now, I tokenize each file once. As I move through the tokens, I use a dictionary lookup to check only for entity names that start with the current word. Instead of testing every entity name against every single position, I only check the candidates that could actually be a match. It turns a process that grew quadratically into one that scales far more efficiently as the corpus expands.

The results changed drastically. The 1,000-file run dropped from 4.4 seconds to under 50 milliseconds. The 5,000-file run went from 107 seconds to less than a second. These specific numbers are from early testing in my Linux development environment, before I ever ran the pipeline on Windows, so don’t expect them to match the Windows numbers later in this article exactly; the benchmark section further down has the real Windows figures. Numbers matter, so here is the actual progression:

| Approach | 100 files | 1,000 files | 5,000 files |
| --- | --- | --- | --- |
| Naive pairwise regex (first version) | ~46 ms | ~4,400 ms | ~107,000 ms |
| Combined regex alternation (intermediate) | ~12 ms | ~597 ms | ~14,000 ms |
| Word-indexed phrase matcher (final) | ~2 ms | ~33 ms | ~492 ms |

The middle row of my benchmark is worth noting, because it was my first attempt at a fix and it failed. I tried combining every entity name into one massive alternation pattern (`Name1|Name2|Name3...`). While this reduced the number of regex objects, the underlying engine still had to check the full list at every single character position it scanned. With 5,000 entities, that is still effectively quadratic behavior wearing a linear disguise. The word-indexed matcher was the only version that actually fixed the complexity, rather than just hiding it behind a faster constant factor.

Here is what the resulting graph actually looks like for three real entities from my test corpus:

[![Image 3: A conceptual diagram showing a bidirectional mention graph excerpt with three knowledge nodes—Attention Mechanism, Learning Rate Schedule, and Gradient Descent—mapped directly to the corresponding Markdown internal link syntax.](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/BIDIRECTIONAL-MENTION-GRAPH-1024x801.png)](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/BIDIRECTIONAL-MENTION-GRAPH.png)

An architectural layout illustrating the direct relationship between raw Markdown backlink syntax and the parsed bidirectional graph visualization. Image by Author

Detection here is strictly lexical, not semantic. It only matches if the exact name appears in the text. It doesn’t know that “the company” and “my employer” might be the same thing. That’s a genuine limitation, and I’ll get into the actual cost of it later in this article.

## Step 3: The section-aware rewriter

This stage writes the actual markdown. It isn’t an abstract syntax tree parser. It doesn’t walk any trees. It just does targeted string replacement between specific ## Heading tags, so I’m calling it a section-aware rewriter.

I didn’t want the compiler to just nuke every file and start from scratch. I needed a way to keep anything I scribbled into a page’s Notes section during a recompile. The logic is dead simple: before it writes a page, it checks if a file already exists on disk. If it does, it grabs whatever is under that page’s ## Notes heading. Then, the compiler-owned sections—Metadata, Related, Referenced By, and Body—get wiped and regenerated from source to keep them accurate, while the Notes content gets written back in as-is.

I didn’t just trust that this would work; I tested it. I manually added a note to a generated page, tweaked the source, and ran the compiler. I confirmed the note stayed put while the other sections updated. I reran the same test on my Windows machine a few days later, and it worked exactly the same way.

Here’s what that actually looks like, start to finish, on one real entity from my test corpus:

```
RAW SOURCE (raw_notes/attention_mechanism.txt)
------------------------------------------------
ATTENTION MECHANISM
created: 2026-02-27

A common mistake is tuning Attention Mechanism without first
checking Learning Rate Schedule.

This section needs a cleaner example before it is considered final.
```

```
COMPILED OUTPUT (compiled_wiki/attention_mechanism.md)
------------------------------------------------
# Attention Mechanism

## Metadata
- created: 2026-02-27
- aliases: none
- source: raw_notes/attention_mechanism.txt

## Related
- [[Learning Rate Schedule]]

## Referenced By
- [[Gradient Descent]]

## Body
A common mistake is tuning Attention Mechanism without first
checking Learning Rate Schedule.

This section needs a cleaner example before it is considered final.

## Notes
_(add your own notes here -- preserved on recompile)_
```

Nothing in the raw file told the compiler that Gradient Descent references this page. That link got added automatically, because Gradient Descent’s own raw note happens to mention “Attention Mechanism” in its body text, and the graph builder caught it. That’s the entire pipeline in one concrete example: messy input in, structured and cross-referenced output out, with zero manual linking.

## Step 4: The Linter (and the Second Bug)

The linter is simple: it walks the output, flags broken links, and calls out pages that nobody else is pointing to. People might mistake this for an LLM “judgment” step, but it’s not. It’s a dumb, structural check with fixed rules.

My first version had a massive bug. I’m mentioning it because it’s the kind of thing you’ll miss unless you write a test that actually probes the logic. The linter counted incoming links by scanning every `[[link]]` in the file. Here’s the problem: the _Referenced By_ section also contains `[[links]]`. Those links track pages that point to the current file, not pages the file points to itself. My linter was counting those as outgoing links, which blew up the count for every page.

The result? On my 100-file test corpus, with 13 confirmed orphans, the buggy linter reported zero. It wasn’t just undercounting, it told me the wiki was perfectly linked when it wasn’t. I would have shipped that error if I hadn’t double-checked the logic against a second source of truth.

The fix was to limit the count to the _Related_ section only. That’s the only place where genuine outgoing edges actually live.

```
related_text = _extract_section(text, "Related")
for match in LINK_RE.finditer(related_text):
    target_slug = _slugify(match.group(1))
    if target_slug in incoming_count:
        incoming_count[target_slug] += 1
```

After that change, the linter’s orphan count matched the graph builder’s exactly. Every time. It held up regardless of the corpus size. I added a regression test for this—named after the bug—so it can never silently creep back in.

## The Full Test Suite

I’ve got 17 tests, using only `stdlib unittest`, covering every stage plus the full end-to-end pipeline. Here’s a representative slice:

```
test_linter_does_not_miscount_referenced_by ... ok
test_human_notes_preserved_across_recompile ... ok
test_recompile_is_idempotent_on_compiler_owned_sections ... ok
test_deterministic_output ... ok

Ran 17 tests in 0.020s
OK
```

That `test_linter_does_not_miscount_referenced_by` is the regression test for the bug I just walked through. It’s the ugliest name in the file, but it’s the most important one.

I didn’t just pick 17 because it felt right; the structure matters. Each stage has its own isolated tests using hand-built `Entity` objects instead of the synthetic generator. I did this so a failure points to exactly one stage. I don’t want to spend an hour debugging a full pipeline just to find a one-line typo.

The full-pipeline tests at the bottom are different. They catch integration problems that unit tests can’t see. The idempotency test is a good example—it recompiles the same corpus twice and makes sure the output is byte-identical both times. If the rewriter had accidentally introduced any non-determinism, like a rogue timestamp, that test would have screamed at me immediately.

I’d rather have 17 tests that each fail for one specific, obvious reason than one massive integration test that fails and leaves me guessing which of the four stages actually broke.

## The Benchmark: Two Machines, Same Numbers

I ran the full pipeline at three different scales, both in a Linux container and on my local Windows 10 machine, using the same seed to keep the source material identical.

Terminal output, raw:

| Files | Extract | Graph | Rewrite | Lint | Compile total | Full pipeline | Orphans |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 100 | 22.8 ms | 3.1 ms | 59.4 ms | 86.0 ms | 85.4 ms | 171.4 ms | 13 |
| 1,000 | 261.5 ms | 47.1 ms | 605.5 ms | 883.9 ms | 914.1 ms | 1,798.0 ms | 133 |
| 5,000 | 1,398.4 ms | 625.6 ms | 3,446.7 ms | 6,972.5 ms | 5,470.6 ms | 12,443.1 ms | 644 |

```
FULL PIPELINE TIME BY STAGE AT 5,000 FILES (12.44s total)
   ============================================================

   extract  [==]                                    1.40s  (11%)
   graph    [=]                                      0.63s  ( 5%)
   rewrite  [=======]                                3.45s  (28%)
   lint     [==============]                         6.97s  (56%)

   ============================================================
```

**Lint is the most expensive stage by far**. At 5,000 files, it costs more than the extract, graph, and rewrite stages combined.

That surprised me. Lint has the lightest logic in the entire pipeline—it just opens each file once to regex-scan two small sections. The bottleneck isn’t the code; it’s the disk I/O. Lint hits every file with a fresh read, and Windows is significantly slower than Linux here. Windows Defender likely contributes to this, checking every file as it opens, though I haven’t verified this directly against Defender’s own logs.

The graph builder has zero disk I/O, so it scales the best, but it isn’t perfectly linear.

**Going from 100 to 1,000 files—a 10x jump in data—took 15.2x the time**. Jumping from 1,000 to 5,000 files (another 5x increase) took 13.3x the time. That’s the real, measurable cost of the word-indexed matcher having to check more candidate names per token as the entity list grows, and it means the scaling isn’t quite linear.

**The orphan counts (13, 133, 644) stayed identical across every single run, regardless of the OS**. That’s not a coincidence. It’s the entire point of building this as a compiler rather than an agent: the outputs are deterministic. They don’t move. Only the wall-clock time shifts, which is just a reflection of the hardware and OS, not the algorithm.

Those orphan numbers are connectivity stats from a synthetic, seeded corpus, not a measure of ‘quality.’ I verified them independently; the graph builder and the linter calculate orphan status through completely different code paths, and they agreed at every scale I tested.

What this means for real-world use: at 5,000 notes, a full recompile takes about 12 seconds on standard Windows hardware—zero token cost, zero network calls. If you’re running at the scale of most personal knowledge bases (a few hundred to a couple thousand notes), a full recompile finishes in under two seconds.

## Where this breaks

**Unstructured or wildly inconsistent source data.** My extractor handles two header styles and some optional metadata because that’s what my test corpus required. If you throw a folder of chaotic, garbled text or multi-language notes with zero structure at it, regex alone isn’t going to cut it. You’d need a significantly more sophisticated extraction layer.

**Semantic linking.** This is the big one. My graph builder uses exact name matching. If one note talks about “gradient descent” and another describes “the optimization step” without using the literal phrase, they won’t link. Nothing in this pipeline understands meaning. That’s the honest boundary of what a deterministic compiler can do. If I were to extend this, I’d bolt a semantic layer on as a clearly separated enhancement—I wouldn’t fold it into the core deterministic path.

The framing isn’t that LLMs are the wrong tool for building a personal wiki. It’s that they’re the wrong tool for the 90 percent of the job that is purely mechanical, and arguably the right tool for the 10 percent that requires actually understanding what the text means rather than just matching how it’s spelled.

## Closing thought

If your input is deterministic, your pipeline should be too. Otherwise, you’re just adding randomness where none existed.

That’s the argument of this entire piece. Not every knowledge management problem needs an agent loop. Sometimes, you just need a parser, a graph, and a linter that tells you the truth about your own output—including the parts where it’s wrong.

The full source code, including the generator, extractor, graph builder, rewriter, linter, benchmark harness, and all 17 tests, is at: [**https://github.com/Emmimal/wiki-compiler/**](https://github.com/Emmimal/wiki-compiler/)

## Resources and citations

This article references the following primary sources. Quoted material is limited to short phrases under fifteen words per source, in line with standard fair-use practice for commentary and technical writing; I’d encourage reading the originals directly rather than relying on my summary of them.

[1] Andrej Karpathy, original post describing LLM-driven personal knowledge bases, X, April 2026. [https://x.com/karpathy/status/2039805659525644595](https://x.com/karpathy/status/2039805659525644595)

[2] Andrej Karpathy, “LLM Wiki” idea file (GitHub Gist), April 2026, describing the wiki-as-compiled-artifact pattern referenced throughout this piece. [https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

All code, benchmark numbers, and test results in this article are my own, generated by running the included codebase directly. No proprietary datasets, copyrighted text, or third-party code were used in building or benchmarking this system.
