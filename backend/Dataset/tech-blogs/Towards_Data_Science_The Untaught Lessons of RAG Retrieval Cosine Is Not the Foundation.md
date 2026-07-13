Title: The Untaught Lessons of RAG Retrieval: Cosine Is Not the Foundation

URL Source: https://towardsdatascience.com/the-untaught-lessons-of-rag-retrieval-cosine-is-not-the-foundation/

Published Time: 2026-07-03T12:00:00+00:00

Markdown Content:
companion to _Enterprise Document Intelligence_, the series whose philosophy is laid out in [Amplify the Expert](https://towardsdatascience.com/amplify-the-expert-a-philosophy-for-building-enterprise-rag/). It zooms in on **brick 3 (retrieval)** of the four-brick architecture and surfaces the lessons most tutorials skip.

The mainstream story has retrieval as _embed the question, return top-k by cosine, optionally rerank_. We disagree with almost every part of it. Retrieval is _filtering on structured tables_, not searching free text. Embeddings are the optional fallback, not the foundation. Anchor and context are two granularities, not one. Each of these is a position we can defend, with consequences you can measure.

![Image 1](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-2-1024x572.png)

_where this article sits in the series: brick 7 (retrieval) highlighted – Image by author_

![Image 2: 📓](https://s.w.org/images/core/emoji/17.0.2/svg/1f4d3.svg)**Runnable companion notebooks are on GitHub**: [doc-intel/notebooks-vol1](https://github.com/doc-intel/notebooks-vol1).

![Image 3](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-1024x658.png)

_The public companion-code repo at doc-intel/notebooks-vol1 – Image by author_

## The naive baseline this article pushes back on[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#the-naive-baseline-this-article-pushes-back-on)

![Image 4](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-3-1024x656.png)

_The architectural contrast: a single cosine signal over chunks vs three signals in parallel on structured tables – Image by author_

The naive pipeline chunks the document, embeds every chunk, embeds the question, ranks by cosine. That single signal is opaque, and it throws away the document’s structure. We keep the document as `line_df` + `toc_df` and run three retrieval signals in parallel (keyword on lines, TOC reasoning, embedding cosine), then let an LLM arbiter rank once at the end with all three sets of hits in view.

![Image 5](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-4-1024x591.png)

_Keywords always run, the TOC always reasons, embeddings fire only when the vocabulary mismatches – Image by author_

Below are the six untaught lessons of this brick.

## Lesson 1 – Retrieval is filtering, not searching[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#lesson-1---retrieval-is-filtering-not-searching)

**Once parsing is done, retrieval is a SQL-like filtering problem over `line_df` and `toc_df`, the reverse of the chunk-embed-cosine-top-k framing.** The shift is simple to state: the question has columns, the document has columns, and retrieval is the join.

Search and filter are not synonyms; the two operations work differently. Search scores every candidate on a continuous similarity (`cosine`, `BM25`), forces a `top-k` cutoff, and always returns something, even when the answer is not in the document. Filter applies a boolean condition (`line.contains("X")`, `toc.title in [...]`), keeps every row that matches and no more, and can return zero rows when the document does not carry the answer. The difference that shows up in practice is the audit trail. A filter’s condition is one line of inspectable code that runs the same way in six months. A search’s ranking depends on which dimensions of the embedding happened to matter, and you cannot replay that judgment without re-running the model.

Take the question _“What positional encoding does the paper use?”_ on the Attention paper. Naive RAG embeds it, scores three hundred-odd chunks, and returns the top five. The series pipeline filters instead: it keeps the four lines of `line_df` that contain `"positional encoding"`, and the one `toc_df` section whose title contains `"positional"`, _3.5 Positional Encoding_. The arbiter then reads both, the lines as the anchor and the section as the scope. No cosine ran, and had the phrase been absent the filter would have returned nothing, which is the honest result.

→ _[Article 7A: Retrieval is filtering, not search](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/) lays out the mental model._

## Lesson 2 – Anchor and context, kept apart[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#lesson-2---anchor-and-context-kept-apart)

**You anchor on the single line that mentions “premium” (precise) but pass the whole surrounding section to generation (sufficient context); conflating them breaks precision and coverage in one move.** Top-k forces you to pick: tiny chunks lose context, huge chunks lose precision. We get both, by keeping them apart.

Two different notions hide inside retrieval, and they are easy to run together. The first is the anchor: the exact place the answer sits, which you reach through a keyword. Ask for the premium amount and the keyword `premium` drops you on the right line, the number written next to the word. Ask for the exclusions and the keyword `exclusions` drops you on the right section. In both cases the keyword is what locates the answer.

The second notion is the context around that anchor: how much text you actually have to read to answer. For the premium it is almost nothing, the value is right there in the line. For the exclusions it is three pages, because the list runs across them. Same precise anchor, very different amount of surrounding text. This is where a single top-k cut breaks down, because it uses one chunk size for both. Small chunks find the premium line but cut the exclusions list in half. Large chunks catch the whole exclusions section but bury the premium line in a page of noise. So we keep the two apart: the keyword marks where the answer is, the scope sets how much surrounding text travels to generation, and retrieval returns them together as a typed pair.

→ _[Article 7A: Retrieval is filtering, not search](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/) draws the line between anchor and context._

## Lesson 3 – Embeddings come last, not first[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#lesson-3---embeddings-come-last-not-first)

**Keywords always run (cheap, deterministic); the document’s own TOC is a first-class retrieval method; embeddings are the optional final signal, only when vocabulary mismatch is expected.** The 2024-era reflex starts with embeddings; we leave them for the cases where the cheaper signals failed.

Take a factual lookup on an insurance policy: _“effective date?”_. Naive RAG embeds the question and returns five chunks. The series pipeline first runs a keyword search for `"effective"` and `"date"`, finds the single line that carries both, and stops there. The embedding step never runs, because the cheap signal already answered. What it cost was one regex pass over `line_df`, a few milliseconds, instead of a cosine search over every chunk. Embeddings are held back for the cases where keywords come up empty, not spent by default.

→ _[Article 7B: Finding the right anchors](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/) builds the three-signal pipeline._

## Lesson 4 – Keywords prove absence; embeddings cannot[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#lesson-4---keywords-prove-absence-embeddings-cannot)

**A zero on keyword search means the answer is genuinely not there; a zero on embedding similarity could be absence or just different words, so embeddings are a refinement, not a decision gate.** This asymmetry is the case for keywords as the primary signal in enterprise RAG.

Take the question _“does this contract cover earthquake damage?”_ on a flood-only policy. A keyword search for `"earthquake"` returns zero matches in `line_df`, so the pipeline can ship `answer_found = False` and mean it: the word is simply not in the document. Embedding cosine behaves differently. It returns five chunks anyway, the lines that sit closest in meaning, about _natural disasters_ and _flood events_, and a model reading them can talk itself into a wrong yes. That is the asymmetry. A zero from keywords is real absence; a low cosine score is only distance. So keywords, not embeddings, are what get to decide whether the answer exists at all.

→ _[Article 7B: Finding the right anchors](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/) explains the keyword-first discipline._

## Lesson 5 – Co-occurrence beats BM25 on narrow corpora[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#lesson-5---co-occurrence-beats-bm25-on-narrow-corpora)

**BM25 ranks by term frequency, but the enterprise answer shape is one mention of a topic next to a specific value, so co-occurrence boosts and high-value regex anchors beat statistical IDF on narrow corpora.** The IDF assumptions break on a 20-document corpus where every term is “rare” by Wikipedia standards.

Take _“what is the deductible amount?”_. BM25 ranks by how often `"deductible"` occurs, so a glossary section that repeats the word a dozen times floats to the top, even though it carries no figure. Co-occurrence works on the answer’s shape instead: it favours the lines that hold both `"deductible"` and a number. The actual policy line, `"the deductible is $1000"`, ranks first because the word and the value sit together, and the model can read the amount straight off it. On a twenty-document corpus, where IDF treats almost every term as rare, that shape signal beats the raw frequency count.

→ _[Article 7B: Finding the right anchors](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/) measures co-occurrence against BM25._

## Lesson 6 – One LLM pass over the TOC[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#lesson-6---one-llm-pass-over-the-toc)

**Handing the 20-100 row `toc_df` to a small model and asking which sections answer the question costs one cached call and catches the paraphrases (“exit early” ≈ “Termination”) keyword matching misses.** TOC reasoning is one of the most under-used retrieval signals in production RAG.

Take _“when can I leave the policy early?”_. Substring matching on `"leave"` finds nothing in the TOC, because the section is called _“Termination and Cancellation”_ and shares no word with the question. Hand the whole TOC, twenty-eight rows, to a small model in a single prompt and ask which sections fit, and it returns _“Termination and Cancellation”_: it reads _“leave early”_ and _“termination”_ as the same idea. The call is cached, so it runs once and stays deterministic afterwards, and it recovers the section that keyword matching walked straight past.

→ _[Article 7B](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/) reasons over the TOC, and [Article 7C: An LLM as arbiter](https://towardsdatascience.com/letting-an-llm-pick-the-right-rag-page-the-arbiter-pattern-at-the-end-of-retrieval/) adds the arbiter._

The six lessons share one move: refuse the chunk-embed-cosine reflex, and treat retrieval as filtering on structured tables instead. Keywords always run because they prove absence; the TOC is a first-class signal because the document already declared its structure; embeddings are the optional refinement, not the foundation. The deep-dives (7A, 7B, 7C, 7bis) ship runnable code on real documents; this piece is the catalogue that points at them.

## Across sectors and professions[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#across-sectors-and-professions)

The same three-signal retrieval pattern ( keyword on `line_df` + reasoning on `toc_df` + embedding fallback ) holds in every domain. The vocabulary and the TOC depth differ; the signal hierarchy does not. Five sectors below, one retrieval pattern, one audit trace per call.

![Image 6](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-1-1024x344.png)

_Embeddings fire only on the medical row where vocabulary diverges from the document – Image by author_

Embeddings fire only on the medical row, where the user’s vocabulary ( _“tachycardia”_ ) diverges from the document’s ( _“rapid heart rate”_ ). The other four rows resolve entirely on keyword + TOC. Keywords prove absence (Lesson 4), the TOC catches paraphrases (Lesson 6), and the anchor / scope split keeps precision and context apart (Lesson 2) in every row. The cost gradient is real: the four keyword-resolved rows run in milliseconds with zero LLM tokens; the medical row pays for one embedding pass and one arbiter call.

## Sources and further reading[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_3_untaught_lessons_retrieval.html#sources-and-further-reading)

The mainstream literature on retrieval is shaped by web-scale search and shorter consumer corpora. The series stance assumes a small enterprise corpus where the structure is known and the vocabulary is the asset.

*   _Retrieval is filtering, not search_ ([Article 7A](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/)). The published mental-model article: retrieval as filtering on structured tables.
*   _Embeddings Aren’t Magic_ ([Article 2](https://towardsdatascience.com/embeddings-arent-magic-the-predictable-failure-modes-of-rag-retrieval-enterprise-document-intelligence-vol-1-2/)). The published failure-modes catalogue for embedding similarity.
*   _Rerankers Aren’t Magic Either_ ([Article 2bis](https://towardsdatascience.com/rerankers-arent-magic-either-when-the-cross-encoder-layer-is-worth-the-cost-enterprise-document-intelligence-vol-1-2bis/)). When the cross-encoder pays off and when it does not.
