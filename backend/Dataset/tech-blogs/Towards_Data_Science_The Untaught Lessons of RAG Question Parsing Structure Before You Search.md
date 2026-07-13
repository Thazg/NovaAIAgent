Title: The Untaught Lessons of RAG Question Parsing: Structure Before You Search

URL Source: https://towardsdatascience.com/the-untaught-lessons-of-rag-question-parsing-structure-before-you-search/

Published Time: 2026-07-02T12:00:00+00:00

Markdown Content:
companion to _Enterprise Document Intelligence_, the series whose philosophy is laid out in [Amplify the Expert](https://towardsdatascience.com/amplify-the-expert-a-philosophy-for-building-enterprise-rag/).

It zooms in on **brick 2 (question parsing)** of the four-brick architecture and surfaces the lessons most tutorials skip.

Most RAG tutorials skip question parsing. The user’s string goes straight to retrieval, cosine runs on top-k, and the model gets handed whatever came back. We do not do that, for one reason: _a user question is not a search query_. Treat it as one and you get silent partial answers, and in production that is where a lot of RAG quietly breaks.

![Image 1](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-382-1024x572.png)

_where this article sits in the series: brick 6 (question parsing) highlighted – Image by author_

![Image 2: 📓](https://s.w.org/images/core/emoji/17.0.2/svg/1f4d3.svg)**Runnable companion notebooks are on GitHub**: [doc-intel/notebooks-vol1](https://github.com/doc-intel/notebooks-vol1).

![Image 3](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-381-1024x658.png)

_The public companion-code repo at doc-intel/notebooks-vol1 – Image by author_

## The naive baseline this article pushes back on

![Image 4](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-385-1024x574.png)

_The architectural contrast: a string sent verbatim vs a typed question\_df row with two briefs – Image by author_

The naive pipeline embeds the user string and asks the vector store for the top-k most similar chunks. Nothing in that setup knows the question had two parts, or that the user wanted an exact value and not a paragraph. So we spend one extra brick on the question itself: a row in `question_df` with five typed columns (keywords, scope, shape, decomposition, clarification) plus satellite tables, and two derived briefs (`RetrievalQuery` for the retrieval brick, `GenerationBrief` for the generation brick).

![Image 5](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-386-1024x508.png)

_From a user string to a typed row with five columns, then to two briefs each downstream brick can act on – Image by author_

The anatomy diagram shows the five core columns, but a production `question_df` carries two more that decide how wide a window retrieval will pass to generation. The context discipline is measured in _lines_ (not characters, too noisy; not pages, too coarse). The table below shows three sample rows: one factual lookup, one yes/no boolean, one listing question. Each row sizes its context window differently, by reading the answer shape and the decomposition pattern.

![Image 6](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-384-1024x375.png)

_One row per ask, seven typed columns, the context window sized in lines around the detected anchor – Image by author_

The two emerald columns are the cheap discipline most pipelines never write down. A factual lookup (premium amount, effective date, deductible value) needs almost no surrounding context: one or two lines before the anchor for verifiability, a few after for the punctuation tail. A listing question needs zero context before and a long forward window because the list extends down the section. The parser fills `lines_before_anchor` and `lines_after_anchor` from the parsed shape and decomposition; retrieval respects them; no magic top-k cutoff travels through the pipeline.

Below are the six untaught lessons that hold the brick together.

## Lesson 1 – A relational schema, symmetric to the document side[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/06_3_untaught_lessons_question_parsing.html#lesson-1---a-relational-schema-symmetric-to-the-document-side)

**The literature has “query understanding” and “query rewriting”, but both treat the question as a string turned into another string.** Modeling it as a row in `question_df` plus satellite tables is not how people usually frame it. What makes it click is the symmetry with the document side (`line_df`, `toc_df`, `span_df`): both sides are relational, both join, and retrieval becomes a filter across them.

Most production pipelines store the question as a single string inside the LLM prompt template. There is no notion of _“the question has a shape”_, _“the question has a scope”_, _“the question has a decomposition”_. When the team needs a new capability (handle negation, handle compound questions, handle ranges), the only place to add it is the prompt template. Six months in, the prompt carries sixty lines of special-case clauses, none of which the audit can trace. Structuring the question once at the parser boundary, the way parsing structures the document at its boundary, removes that rot at its source.

Take the question _“What is the premium amount and the renewal deadline?”_. The naive baseline embeds the whole string and ranks chunks against it. The series fills one row of `question_df` instead: keywords `["premium", "amount", "renewal", "deadline"]`, scope `"contract"`, shape `(Amount, Date)`, and decomposition `"independent"`, because the two parts stand on their own. Now retrieval has a row to filter `line_df` against, and generation has a typed shape to fill, one value and one date.

A harder case shows why the shape is worth recording. A legal counsel asks _“Does the indemnification clause survive termination, and if so, for how long?”_. Passed to the LLM as one string, the answer often comes back with a yes or no on the survival and quietly skips the duration. The series records shape `(Boolean, Duration)` and decomposition `"conditional"`, since the duration only means anything when survival is true. The downstream bricks then know which sub-question depends on which, and neither half can go missing without the pipeline noticing.

→ _[Article 6A: Parse the question before you search](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/) walks through the whole parser end to end._

## Lesson 2 – A schema, not branching code[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/06_3_untaught_lessons_question_parsing.html#lesson-2---a-schema-not-branching-code)

**Most RAG codebases grow the question-handling logic as branching code, gated by `if intent == "..."` chains that ossify over months.** We grow the brick as a _schema_ instead: a new capability is a column added to `question_df`, edited by the expert, not a new code path. The cost of a new feature stays linear in the number of columns, not quadratic in branch combinations.

Say you need to add negation handling, so the brick can tell _“policies that cover flood”_ from _“policies that do not cover flood”_. In a branching codebase, that means a new branch in the prompt-assembly code, the tests that go with it, and a regression test to make sure the old paths still hold. As a schema, it is one column: add `negation_present` as a boolean, list the negation tokens in a small dictionary, write down what the downstream bricks should do with it, and let the dispatcher read the column where it needs to. The new capability is something the expert can see and edit, not a code path buried in an if-chain.

→ _[Article 6B: Five fields RAG should extract from any question](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/) builds the five columns one by one._

## Lesson 3 – Two briefs, one per downstream brick[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/06_3_untaught_lessons_question_parsing.html#lesson-3---two-briefs-one-per-downstream-brick)

**The default is one prompt that carries everything, where retrieval has to ignore the generation-only fields and generation has to re-parse the retrieval fields.** We split them: the retrieval brick receives only what it can act on (keywords, scope, structural hints), and the generation brick receives only what it needs (intent, output shape, exclusions). Each downstream brick reads a brief sized to its job, not the whole question.

Take _“What is the premium amount in dollars, not euros?”_. Retrieval only needs to find the line, so its brief is the keywords `["premium", "amount"]` and the scope `"contract"`. Generation needs to shape and constrain the answer, so its brief is `"Amount(value, currency='USD')"` with the exclusion `["EUR"]`. Retrieval never has to reason about the currency exclusion, and generation never has to re-extract the keywords. Each brick reads only the fields it can act on, and nothing carries a field it has to ignore.

→ _[Article 6A](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/) splits the question into two briefs, and [Article 6B](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/) extracts the columns._

## Lesson 4 – The expert dictionary that beats embeddings[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/06_3_untaught_lessons_question_parsing.html#lesson-4---the-expert-dictionary-that-beats-embeddings)

**The standard story sells embeddings as the way to handle synonyms: a user types “premium”, the model “knows” it relates to “monthly contribution”.** In practice `concept_keywords_df` maps the user’s word to the document’s word _before any search_, for a fraction of the cost and none of the drift. The expert maintains the dictionary as a wiki; the embedding model has no opinion on which alias is canonical in your corpus.

A user types _“How much do I pay each month?”_, and nowhere does the policy use those words. Embed the question and cosine drifts to generic _payment_ pages. The series checks `concept_keywords_df` first, where the expert has mapped _“pay each month”_ to `["premium", "monthly contribution", "monthly installment"]` for this insurance corpus. Retrieval runs a keyword search on those three terms, and the real line, _“premium of $124 / month”_, comes up at once. The dictionary did the synonym work an embedding is supposed to do, but with terms a human chose and can audit, at none of the cost.

→ _[Article 6B: Five fields RAG should extract from any question](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/) explains the `concept\_keywords\_df` mechanism._

## Lesson 5 – Four compound-question patterns, none silent[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/06_3_untaught_lessons_question_parsing.html#lesson-5---four-compound-question-patterns-none-silent)

**A two-part question (“amount and deadline”) is typically answered for one part and silently dropped for the other.** The series names the four patterns (independent, sequential, unified, conditional) and forces the parser to mark which one applies. The pipeline then either decomposes (and runs in parallel), chains (and feeds part A into part B), or refuses to answer the half it could not cover. No silent partial answer.

A user asks _“What is the deductible if the claim exceeds the cap, and what is the cap?”_. This is a sequential compound: you cannot settle the first part until you know the cap. Sent as one string, the LLM tends to answer about the cap and drop the conditional deductible clause on the floor. The series marks `decomposition = "sequential"`, splits out part A (`cap?`) and part B (`deductible if claim > cap?`), and runs them in that order. Each part comes back with its own citation, and if one genuinely is not in the document, it is marked not-found rather than skipped in silence.

→ _[Article 6B: Five fields RAG should extract from any question](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/) lays out the four compound patterns._

## Lesson 6 – Deterministic dispatcher, not LLM-decides[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/06_3_untaught_lessons_question_parsing.html#lesson-6---deterministic-dispatcher-not-llm-decides)

**The agentic reflex says: let the LLM pick which retrievers, schemas, and prompt fragments to activate per call.** We catalogue three approaches: _user-explicit_ (the form drives the activations), _deterministic-dispatcher_ (rules in code map question features to activations), and _LLM-decides_ (the model plans itself). The first two stay. We drop the third for enterprise, because a system that re-plans itself every call cannot be audited the same way twice.

Run the same compliance question through the system twice. With a deterministic dispatcher, the audit log shows the identical path both times: `decide.py` line 47 fired, `route = "factual_lookup"`, retrieval methods `["keyword", "toc"]`, generation schema `AmountWithEvidence`. Let the LLM decide instead, and the two runs leave two different reasoning traces, with no guarantee the routing lands the same way tomorrow. When a regulator asks why the system answered as it did, you can replay the deterministic path exactly; the self-planning one you can only reconstruct after the fact.

→ _[Article 6C: One parsed RAG question, four decisions](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/) covers the dispatcher pattern._

The six lessons share one move: take a step the mainstream playbook treats as inline string processing, and make it a typed brick instead. Once the question is a row with columns, the rest of the pipeline gets to filter, type-check, and dispatch in ways a flat string never could. The deep-dives (6A, 6B, 6C, 6bis) ship runnable code on real corpora; this piece is the catalogue that points at them.

**A note on intent detection.** Vol.1 stays minimal on intents: the dispatcher recognises a baseline set (factual lookup, listing, quick summary read from `parsing_summary.summary`, deep summary from TOC + first lines, cross-reference resolution, out-of-corpus refusal), enough to dispatch the most common enterprise PDF questions correctly. The _full_ intent taxonomy lands in **Volume 2** (translation, summarisation across documents, comparison, redaction, proofreading), where the intent × format matrix produces dozens of dispatch paths on top of the four-brick spine. Vol.1 keeps the spine clean; Vol.2 builds the matrix.

## Across sectors and professions

The brick treats every domain the same way: extract typed columns from the question, derive the two briefs. The expert dictionary inside `concept_keywords_df` is sector-specific; the schema and the dispatch logic are universal. Five sectors below, one parsing pattern, the same five columns.

![Image 7](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-383-1024x344.png)

_The brick treats every domain the same way; only the expert dictionary changes – Image by author_

What changes from row to row is the expert dictionary. An insurance broker’s `concept_keywords_df` maps _“pay each month”_ to `["premium", "monthly contribution", "monthly installment"]`; the medical equivalent maps _“blood thinner”_ to `["anticoagulant", "warfarin", "heparin", "DOAC"]`; the financial equivalent maps _“top line”_ to `["revenue", "net revenue", "GAAP revenue"]` . The brick’s columns, dispatch, and audit trail stay identical.

## Where these lessons land in the series[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/06_3_untaught_lessons_question_parsing.html#where-these-lessons-land-in-the-series)

The numbered articles develop each lesson in code, with runnable notebooks:

*   Article 6A (question parsing: thesis) makes the case that a string is not a query and shows the relational shape.
*   Article 6B (question parsing: extraction) walks the five families of columns (keywords, scope, shape, decomposition, clarification) that fill `question_df` .
*   Article 6C (question parsing: dispatch) develops the dispatcher that turns a parsed question into routing decisions.
*   Article 6bis (clarification loop) handles the case where the question is too vague to route and the system asks one focused clarification.

## Sources and further reading

The book/article literature on query understanding is consumer-search-shaped (Elastic, Google) and does not transfer cleanly to a small enterprise corpus where the expert vocabulary is the asset. The series’s stance is the relational-shape rebuild on top of the structured document side.

*   _Parse the question before you search_ ([Article 6A](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/)). The published thesis of question parsing.
*   _Five fields RAG should extract from any question_ ([Article 6B](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/)). The column-by-column extraction in code.
*   _One parsed RAG question, four decisions_ ([Article 6C](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/)). The dispatcher pattern that turns the parsed columns into routing decisions.
*   _When RAG users ask vague questions_ ([Article 6bis](https://towardsdatascience.com/when-rag-users-ask-vague-questions-clarify-once-learn-the-default/)). The clarification loop that learns the default after one ask.

**Earlier in the series:**

*   [Article 1: Baseline Enterprise RAG, from PDF to highlighted answer](https://towardsdatascience.com/baseline-enterprise-rag-from-pdf-to-highlighted-answer-enterprise-document-intelligence-vol-1-1/). The four-brick pipeline end to end, where the question still ships as a verbatim string.
*   [Article 2: Embeddings Aren’t Magic](https://towardsdatascience.com/embeddings-arent-magic-the-predictable-failure-modes-of-rag-retrieval-enterprise-document-intelligence-vol-1-2/). The failure-modes catalogue that explains why embedding the user string is not a substitute for parsing it.
*   [Article 3: RAG is not machine learning](https://towardsdatascience.com/rag-is-not-machine-learning-and-the-ml-toolkit-solves-the-wrong-problem/). The companion stance: the answer exists or it does not, so question structure beats statistical generalisation.
*   [Article 4: From regex to vision models](https://towardsdatascience.com/from-regex-to-vision-models-which-rag-technique-fits-which-problem/). The decision frame that picks technique by question type, the upstream of every dispatch this brick performs.
