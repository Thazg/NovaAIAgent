Title: Context Engineering for RAG: The Four Typed Inputs Behind Every Answer

URL Source: https://towardsdatascience.com/context-engineering-for-rag-the-four-typed-inputs-behind-every-rag-answer/

Published Time: 2026-06-30T16:30:00+00:00

Markdown Content:
companion to [Enterprise Document Intelligence](https://towardsdatascience.com/amplify-the-expert-a-philosophy-for-building-enterprise-rag/), a series whose stance is that enterprise RAG amplifies the expert, it does not replace them. The architecture follows from that: four bricks (document parsing, question parsing, retrieval, generation), each emitting typed pieces that converge on one LLM call. The industry now calls that practice _context engineering_. Scope here is the single-document case; corpus, conversation, and tool-call extensions are follow-up work.

![Image 1](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-359-1024x572.png)

_where this article sits in the series: Article 7bis (context engineering), the reframing companion to the four bricks – Image by author_

![Image 2: 📓](https://s.w.org/images/core/emoji/17.0.2/svg/1f4d3.svg)**Runnable notebooks are on GitHub**: [doc-intel/notebooks-vol1](https://github.com/doc-intel/notebooks-vol1).

![Image 3](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-361-1024x658.png)

_The public companion-code repo at doc-intel/notebooks-vol1 – Image by author_

By the time the four bricks of a single-document RAG are built, the assembly is settled. Parsing produces relational tables. Question parsing produces a typed `ParsedQuestion`. Retrieval produces a filtered subset of lines, plus an audit of how it picked them. Generation produces a Pydantic answer with cited evidence. The whole thing converges on one LLM call, with a fixed system prompt and a user content assembled from upstream pieces.

That pipeline has a name now. In June 2025 [Tobi Lütke tweeted](https://x.com/tobi/status/1935533422589399127) that _“prompt engineering”_ was the wrong frame, and proposed _“context engineering”_ instead: _“the art of providing all the context for the task to be plausibly solvable by the LLM.”_[Andrej Karpathy endorsed it](https://x.com/karpathy/status/1937902205765607626) a week later as _“the delicate art and science of filling the context window with just the right information for the next step.”_ Within months the term was on the cover of an O’Reilly book and structured into a taxonomy by LangChain.

What follows reads the single-document RAG pipeline through that lens. Each brick emits typed pieces; the assembly stage threads them into the LLM call; the system prompt stays fixed for caching. Naming the practice does not change the architecture. It changes what to call it when an auditor asks how the system works, and it tells the reader that the architecture is the one production teams converged on in 2025.

## 1. The name, and what it covers[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#the-name-and-what-it-covers)

Prompt engineering used to mean two related things. Tuning the wording of one prompt to coax better behaviour, and writing example shots so the model knew what good output looked like. Both are narrow. They concern one block of text sent to one call.

Context engineering covers everything that lands in the model’s context window for one call:

*   The system prompt (the role, the rules, the examples).
*   The retrieved documents or rows.
*   Conversation history when there is one.
*   Tool definitions and their outputs.
*   Memory, scratchpads, agent state.
*   Structured metadata about the document, the corpus, the project.
*   The actual user input.

In a long-running agent that calls the model dozens of times, the prompt is one of six or eight slots. The rest comes from somewhere upstream: a retriever, a tool, a memory store, a profile lookup. The discipline shifts from _“what should I write in the prompt”_ to _“what should I assemble in the context, where does each piece come from, and how do I keep the assembly stable across calls.”_

That is engineering work. It looks like software architecture: typed objects, contracts between components, audit trails, caching. The 2025 term is overdue, because the practice was already there in the working production systems. Lütke and Karpathy named what teams were already doing.

The series happens to have done it from the start, brick by brick. The next sections walk through what each brick contributes to a single-document RAG payload, then through the four typed pieces that land in the LLM call and the code that produces each one. The corpus, conversation, and tool-call cases come up at the end as out-of-scope work, with pointers to where in the series they will be addressed.

![Image 4](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-362-1024x1024.png)

_Seven typed bricks feeding the LLM’s context window, grouped by source: question, documents, infrastructure. – Image by author_

## 2. Every brick emits typed context[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#every-brick-emits-typed-context)

![Image 5](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-360-1024x492.png)

_The four bricks emit typed context channels that converge on the assembly band on top, where PromptContext, the fixed system prompt, and the user template combine before the LLM call. – Image by author_

The schema above is the recap of what the series shipped. Each brick is a typed-context emitter. The names on the boxes are the actual fields of the actual Pydantic classes and DataFrames the code produces.

**Parsing emits relational tables and one synthesis dict.**`line_df` carries one row per line with bbox. `page_df` carries one row per page with type and column count. `toc_df` carries the table-of-contents entries with start page and depth. `image_df` carries embedded images with phash and metadata. `parsing_summary` is the doc-level synthesis: `doc_type`, `n_pages`, `typical_fields`, `summary`, plus the mechanics fields. The retrieval brick consumes the per-row tables. The question parsing brick consumes the semantic subset of `parsing_summary` via `DocContext`.

**Question parsing emits a `ParsedQuestion`.** Its fields are not free-form. `keywords` is a short list of content noun phrases for retrieval. `intent` is a literal label from a fixed enum that drives shape dispatch in generation. `structural_hints.pages_hint` carries pinned pages when the user said _“on page 3”_. `answer_shape` carries the expected output shape (text, amount, date, list, table, address) for the generation schema lookup. Each field is consumed by a different downstream brick. None of them are passed as raw strings to the LLM. Three articles build this row, each worth reading for a different reason:

*   [Article 6A (question parsing thesis)](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/): the case for parsing the question before searching, and the split into a retrieval brief and a generation brief.
*   [Article 6B (question parsing extraction)](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/): the fields the parser reads from the user string, keywords, scope, shape, decomposition, and clarification.
*   [Article 6C (question parsing dispatch)](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/): how the parsed row picks a chunk strategy, a model tier, and the activation flags.

**Retrieval emits a filtered DataFrame and an audit dict.**`filtered_line_df` is the subset of `line_df` the generation brick sees. `anchor_pages` is the page IDs that were kept and why. The `retrieval_audit` carries the method that won (keyword, TOC, LLM arbiter), the LLM TOC reasoning when applicable, and the selected sections. The filtered frame is what the LLM reads. The audit is what an auditor reads. Three articles build this brick, in the order the pieces run:

*   [Article 7A (retrieval as filtering)](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/): the mental model, narrow the candidate set rather than search it.
*   [Article 7B (anchor detection)](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/): the keyword, embedding, and TOC detectors run in parallel to find the anchor pages.
*   [Article 7C (the LLM arbiter)](https://towardsdatascience.com/letting-an-llm-pick-the-right-rag-page-the-arbiter-pattern-at-the-end-of-retrieval/): one LLM call picks the final page and says why.

**Generation is a consumer, not an emitter.** It takes the question, the filtered lines, the `PromptContext`, and the answer schema. It calls the LLM. It returns a Pydantic typed answer. The dashed border on the Generation box signals that role.

The violet “PROMPT ASSEMBLY” zone on the right is where context engineering happens as code. We implement it via three primitives:

*   A `PromptContext(BaseModel)` aggregator with one field per upstream context source: `doc_context`, future `corpus_context`, future `project_context`.
*   A fixed `MODULE_SYSTEM_PROMPT` at the module level for each brick that calls the LLM.
*   A `MODULE_USER_TEMPLATE` with named placeholders the brick fills via `str.format(...)`.

Article 1 (the minimal four-brick RAG) introduced the bricks as a flow. Article 6A (the question parsing thesis) made the question parser typed. Article 8A (the typed generation contract) makes the generation schema typed. This article reads the same four bricks through the lens of _“what context does each one contribute, how do they reach the LLM call without polluting each other.”_ Same code, different lens.

## 3. The four typed pieces of a single-document payload[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#the-four-typed-pieces-of-a-single-document-payload)

What lands in the LLM call for a single-document RAG is four pieces, each produced by a different piece of code, each with a different cost-and-cache profile. This section walks the four in the order they appear in the user content the LLM reads.

### 3.1 The fixed system prompt[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#the-fixed-system-prompt)

The first piece is the system message. The role description, the rules, the examples. It does not change across calls. The series writes it as a Python constant at the module level, then exposes it as a kwarg with a default so a caller can override per domain without forking:

```
PARSE_QUESTION_SYSTEM_PROMPT = (
    "You extract content noun phrases from the user's question..."
)

def parse_question(question, *,
                   system_prompt: str = PARSE_QUESTION_SYSTEM_PROMPT,
                   user_template: str = PARSE_QUESTION_USER_TEMPLATE,
                   context: PromptContext | None = None):
    ...
```

Two operational consequences. The prompt is **cacheable** by the LLM provider, because it does not change across calls on the same model. Cached input costs roughly ten times less than fresh input on the providers that publish a tariff. And the prompt is **auditable**, because it lives at a stable Python symbol an auditor can grep, version, and diff between releases.

### 3.2 The retrieved lines, filtered by the dispatcher[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#the-retrieved-lines-filtered-by-the-dispatcher)

The second piece is the lines the LLM actually reads. The dispatcher consumes `ParsedQuestion.keywords` and `structural_hints`, picks a method (keyword, TOC, LLM arbiter), and returns the filtered frame plus the audit. The user content gets the filtered frame; the audit lives on disk for the operator to inspect later:

```
retrieved, filtered_line_df, audit = dispatch_page_retrieval(
    question, line_df, page_df,
    toc_df=toc_df, keywords=keywords,
    top_k=5, use_toc=True,
)
```

What ships to the LLM in user content is the filtered frame, not the whole document. A 200-page contract becomes ten pages of relevant lines. The user content stays under a few thousand tokens. The audit explains why each page made it in, so a caller can challenge the selection without re-running the call.

### 3.3 The doc-context block, compact JSON[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#the-doc-context-block-compact-json)

The third piece is the doc-level synthesis: doc type, page count, typical fields, summary. It lands in the user content as a compact JSON object so the LLM can scope ambiguous wording against the document’s nature. The series implements it as a method on every context-carrying Pydantic class. `DocContext.as_prompt_json()` builds the smallest JSON that still names the four fields; null and empty values are dropped:

```
class DocContext(BaseModel):
    doc_type: str | None = None
    n_pages: int | None = None
    typical_fields: list[str] = []
    summary: str | None = None

    def as_prompt_json(self) -> str:
        payload = {k: v for k, v in self.model_dump().items()
                   if v is not None and v != []}
        return json.dumps(payload, separators=(",", ":"))
```

Measured on a CV with `doc_type="resume"`, `n_pages=1`, and four typical fields, the payload is under 200 characters. On an unknown document where every field is null or empty, the payload is the empty object `{}` and the bloc is omitted entirely from the user content. The same pattern applies to the reserved corpus-context and project-context slots when later articles activate them.

### 3.4 The `PromptContext` aggregator that wraps the three above[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#the-promptcontext-aggregator-that-wraps-the-three-above)

The fourth piece is the aggregator. Each LLM-calling brick takes one optional `context: PromptContext` kwarg. The aggregator carries the doc-context in its own typed slot today, with reserved slots for the corpus-context and project-context the follow-up articles will activate. The helper `render_context_block(context)` walks the non-null fields and emits one labelled JSON bloc per layer at the head of the user content:

```
class PromptContext(BaseModel):
    doc_context:     DocContext | None = None
    # corpus_context:  CorpusContext  | None = None  # reserved
    # project_context: ProjectContext | None = None  # reserved
```

Each LLM brick takes one optional `context: PromptContext` kwarg. The helper `render_context_block(context)` walks each non-null field, renders its compact JSON, and emits one labelled bloc per layer. Adding a new layer means uncommenting one field, adding two lines in the helper, and every brick picks the new layer for free. The signature is stable across releases.

## 4. What changes in practice[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#what-changes-in-practice)

Naming the practice changes three operational things, even with the code unchanged.

**Audit.** When the answer is wrong, the question is no longer _“what did the prompt say.”_ The question is _“what landed in the context window for that call.”_ The series persists every brick output to disk: `parsing/`, `questions/<hash>/parsed_question.json`, `retrieval/<hash>/retrieved_pages.parquet`, `retrieval/<hash>/retrieval_audit.json`. The auditor reconstructs the context payload from those files. Then the question becomes specific: was the doc_context wrong, were the wrong pages selected, did the system prompt drift between releases, was the user template stale. Each of those has a different fix.

**Cost.** Two levers compound. The system prompt is fixed across calls on the same model, so it pays cached-input tariff. The user content has been compressed via `as_prompt_json` and selected via retrieval, so the variable part is small. On a corpus of 100 documents with 10 questions each, the dominant cost is the variable part times 1000 calls. Naming the practice does not change the math, but it makes the budget for each call legible: every line in the context payload has a generator that someone can point at.

**Composition across follow-up work.** The `PromptContext` aggregator has one field activated today, with two more reserved for the corpus-context and project-context layers a later piece of the series adds. When those land, this article does not need a rewrite. The signature stays. The body of `render_context_block` grows by one branch. Every brick that already takes `context: PromptContext | None` picks up the new sub-context for free. The discipline pays off in deferring breakage across releases.

## 5. Out of scope, with pointers[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#out-of-scope-with-pointers)

The single-document case stops here. Context engineering at large covers three things this article does not touch:

*   **Corpus context.** When the answer requires reading across many documents, the LLM needs a sense of _which documents are in scope and what they have in common_. That lives in a future `CorpusContext` Pydantic, fed by an aggregator over per-document `parsing_summary` values. The slot is reserved in `PromptContext` so the brick signatures do not change. A later article walks the build and the consumer wiring.
*   **Conversation history.** Multi-turn chat carries prior question / answer pairs the LLM should consider before answering the new question. That is a state problem (where does the history live, when is it summarised, when is it pruned) on top of a context problem. A later article in the series treats it as a first-class brick.
*   **Tool calls.** Agent loops bring tool definitions, tool outputs, and intermediate state into the context window. The selection / compression / isolation problems get sharper there because the context window fills up quickly across turns. A later article in the series treats agentic context engineering as its own topic.

The four canonical strategies the [LangChain blog](https://blog.langchain.com/context-engineering-for-agents/) names (_write_, _select_, _compress_, _isolate_) were developed with the agent loop in mind. Two of them (write and select) translate cleanly to the single-document case as the system prompt and the retrieval dispatcher. The other two (compress and isolate) apply in spirit but bite harder once corpus and conversation enter the picture, which is why this article does not force the four-way mapping.

## See it live[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#see-it-live)

A short live companion runs in the [shipai dashboard](https://github.com/doc-intel/ship-ai). Click any candidate page in the audit trail, then click **anchor / paragraph / section / page** in the picker above.

![Image 6](https://contributor.insightmediagroup.io/wp-content/uploads/2026/06/image-363.png)

_The shipai live demo: same anchor, four context-scope choices side by side, the user widens the highlight to see the tradeoff – Image by author_

Same anchor, four context-scope choices side by side. **anchor** is one line. **paragraph** is ±5 lines on the same page. **section** uses the TOC to widen to the section body. **page** fills the whole page. The article’s trade-off (cost vs precision) becomes a slider you can feel on a real PDF instead of a paragraph of prose.

## 6. Conclusion[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#conclusion)

The 2025 industry conversation around _context engineering_ gives a name to a discipline single-document RAG already practises brick by brick. Parsing emits relational tables and a doc-level synthesis. Question parsing emits a typed `ParsedQuestion` whose fields each drive a different downstream brick. Retrieval emits a filtered line set plus an audit. Generation consumes the assembled payload through a fixed system prompt, a templated user content, and a `PromptContext` aggregator with one typed slot per upstream layer.

The label is what changes: an auditor, a hiring manager, or a vendor reading the architecture can place it inside the 2025 vocabulary without further translation. The bricks, the schemas, and the cost-versus-cache trade-offs are unchanged. The corpus, the conversation, and the tool-call cases come up as follow-up work, each with its own typed slot reserved in the same aggregator.

## 7. Sources and further reading[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/07_2_context_engineering.html#sources-and-further-reading)

The 2025 conversation, in chronological order.

*   [Walden Yan, _Don’t build multi-agents_, Cognition, June 12 2025](https://cognition.com/blog/dont-build-multi-agents). The earliest piece that names the discipline. Yan’s claim that _“context engineering is effectively the #1 job of engineers building AI agents”_ is the line Lance Martin later quotes when he introduces the four-strategy taxonomy.
*   [Tobi Lütke, X, June 18 2025](https://x.com/tobi/status/1935533422589399127). The naming tweet: _“I really like the term ‘context engineering’ over prompt engineering. It describes the core skill better: the art of providing all the context for the task to be plausibly solvable by the LLM.”_
*   [Lance Martin, _Context Engineering for Agents_, June 23 2025](https://rlancemartin.github.io/2025/06/23/context_engineering/). The taxonomy paper. Also [republished on the LangChain blog](https://blog.langchain.com/context-engineering-for-agents/) under the LangChain Team byline.
*   [Andrej Karpathy, X, June 25 2025](https://x.com/karpathy/status/1937902205765607626). The endorsement: _“+1 for ‘context engineering’ over ‘prompt engineering’. People associate prompts with short task descriptions you’d give an LLM in your day-to-day use. In every industrial-strength LLM app, context engineering is the delicate art and science of filling the context window with just the right information for the next step.”_
*   [Drew Breunig, _How to Fix Your Context_, June 26 2025](https://www.dbreunig.com/2025/06/26/how-to-fix-your-context.html). A parallel taxonomy: six concrete tactics (RAG, Tool Loadout, Context Quarantine, Context Pruning, Context Summarization, Context Offloading) for keeping the context window healthy.

The taxonomies, side by side.

*   Lance Martin: four strategies for the agent loop (_write_, _select_, _compress_, _isolate_). Single-document RAG translates the first two cleanly; the other two bite harder once corpus and conversation enter the picture.
*   Drew Breunig: six tactics (RAG, Tool Loadout, Context Quarantine, Pruning, Summarization, Offloading). More fine-grained, less abstract. Useful when the agent loop is already running and the context window is filling up.

The longer treatments.

*   [Addy Osmani, _Context Engineering: Bringing Engineering Discipline to Prompts, Part 1_, O’Reilly Radar, August 11 2025](https://www.oreilly.com/radar/context-engineering-bringing-engineering-discipline-to-prompts-part-1/). The engineering-discipline reframe, slightly later than the X conversation: _“Prompt engineering was about cleverly phrasing a question; context engineering is about constructing an entire information environment so the AI can solve the problem reliably.”_
*   [Mike Taylor, _Context Engineering with DSPy_, O’Reilly book](https://www.oreilly.com/library/view/context-engineering-with/0642572261603/). Book-length treatment grounded in DSPy’s signature-first model.
*   [Prompt Engineering Guide, _Context Engineering Guide_](https://www.promptingguide.ai/guides/context-engineering-guide). Formalised tutorial with worked examples.

Counterpoints.

*   Weaviate, _Context Engineering_ ebook (23 p, December 2025). The vendor framing: six components (Agents, Query Augmentation, Retrieval, Prompting Techniques, Memory, Tools). The series’ position on this rebrand, where the relabelling tracks the product line rather than the practice, is covered in a follow-up critique post.
*   [Roadie blog, _Why Conflating RAG with Context Engineering Costs You in Production_](https://roadie.io/blog/rag-vs-context-engineering-production/). The opposite framing: keeping RAG and context engineering distinct, with retrieval as one slot among many.

The series primitives this article references.

*   `PromptContext` aggregator and `DocContext` projection: `src/docintel/core/schemas/`.
*   `render_context_block` helper: `src/docintel/core/prompts.py`.
*   Module-level system prompts and user templates: every LLM-calling module under `src/docintel/`, by convention. **Earlier in the series:**
*   [Amplify the Expert: A Philosophy for Building Enterprise RAG](https://towardsdatascience.com/amplify-the-expert-a-philosophy-for-building-enterprise-rag/). The series’ manifesto: the four bricks (parsing, question parsing, retrieval, generation) are designed to scale the expert’s judgement, not replace it.

_Part I: What works, what breaks_

*   [Baseline Enterprise RAG, from PDF to highlighted answer](https://towardsdatascience.com/baseline-enterprise-rag-from-pdf-to-highlighted-answer-enterprise-document-intelligence-vol-1-1/). The four-brick pipeline end to end: PDF in, highlighted answer out.
*   [Embeddings Aren’t Magic: The Predictable Failure Modes of RAG Retrieval](https://towardsdatascience.com/embeddings-arent-magic-the-predictable-failure-modes-of-rag-retrieval-enterprise-document-intelligence-vol-1-2/). Where embedding similarity wins (synonyms, typos, paraphrase), where it predictably breaks (unknown terms, negation, term-vs-answer relevance), and how to use it anyway. 
    *   [Rerankers Aren’t Magic Either: When the Cross-Encoder Layer Is Worth the Cost](https://towardsdatascience.com/rerankers-arent-magic-either-when-the-cross-encoder-layer-is-worth-the-cost-enterprise-document-intelligence-vol-1-2bis/). What a cross-encoder adds over bi-encoder embeddings, measured, and when it is worth the latency.

*   [RAG is not machine learning, and the ML toolkit solves the wrong problem](https://towardsdatascience.com/rag-is-not-machine-learning-and-the-ml-toolkit-solves-the-wrong-problem/). Why chunk-size sweeps and finetuning optimize the wrong thing; route by question type instead.
*   [From regex to vision models: which RAG technique fits which problem](https://towardsdatascience.com/from-regex-to-vision-models-which-rag-technique-fits-which-problem/). Two axes, document complexity and question control, that pick the technique for each case. 
    *   [10 common RAG mistakes we keep seeing in production](https://towardsdatascience.com/10-common-rag-mistakes-we-keep-seeing-in-production/). Ten production mistakes, organized brick by brick, with the fix for each.

_Part II: The four bricks_

Document parsing

*   [Beyond extract_text: the two layers of a PDF that drive RAG quality](https://towardsdatascience.com/beyond-extract_text-the-two-layers-of-a-pdf-that-drive-rag-quality/). The first half of the parsing brick: the document’s nature, signals, and summary.
*   [Stop returning flat text from a PDF: the relational tables RAG needs](https://towardsdatascience.com/stop-returning-flat-text-from-a-pdf-the-relational-shape-rag-needs/). The second half of the parsing brick: the relational tables every downstream brick reads. 
    *   [When PyMuPDF can’t see the table: parse PDFs for RAG with Azure Layout](https://towardsdatascience.com/when-pymupdf-cant-see-the-table-parse-pdfs-for-rag-with-azure-layout/). The same tables from Azure Layout: native table cells, OCR, paragraph roles.
    *   [Parse PDFs for RAG locally with Docling: rich tables, no cloud upload](https://towardsdatascience.com/parse-pdfs-for-rag-locally-with-docling-rich-tables-no-cloud-upload/). The same tables computed locally with Docling: TableFormer cells, nothing leaves the machine.
    *   [Vision LLMs are PDF parsers too: reading charts and diagrams for RAG](https://towardsdatascience.com/vision-llms-are-pdf-parsers-too-reading-charts-and-diagrams-for-rag/). Vision as a parser: the pictures become searchable text.
    *   [Parse scanned PDFs for RAG with EasyOCR: free OCR gives you words, not a document](https://towardsdatascience.com/parse-scanned-pdfs-for-rag-with-easyocr-free-ocr-gives-you-words-not-a-document/). Where traditional OCR stops: text recovered, structure lost.
    *   [Making a PDF’s images searchable for RAG, without paying to read them all](https://towardsdatascience.com/making-a-pdfs-images-searchable-for-rag-without-paying-to-read-them-all/). The image cascade: filter cheap, classify, describe only what is worth reading.
    *   [Reconstructing the table of contents a PDF forgot to ship, so RAG can scope by section](https://towardsdatascience.com/reconstructing-the-table-of-contents-a-pdf-forgot-to-ship-so-rag-can-scope-by-section/). Rebuilding toc_df when the PDF prints a contents page but ships no outline.

Question parsing

*   [Parse the question before you search: the missing step in most RAG pipelines](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/). The thesis of question parsing: why a user string needs the same parsing as a document, and how it splits into a retrieval brief and a generation brief.
*   [Five fields RAG should extract from any question: keywords, scope, shape, decomposition, clarification](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/). The five families of columns the parser reads straight from the user’s question, with the code that fills each one.
*   [One parsed RAG question, four decisions: chunk strategy, model tier, fragments, audit trail](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/). The decisions the parser makes on top of the user string, using the document’s profile: dispatch, activations, full schema, the audit trail (pipeline_trace.json), and a broker-corpus walkthrough. 
    *   [When RAG users ask vague questions: clarify once, learn the default](https://towardsdatascience.com/when-rag-users-ask-vague-questions-clarify-once-learn-the-default/). One focused clarification when the question is too vague, and the default learned from the answer.

Retrieval

*   [Retrieval is filtering, not search: a mental model for enterprise RAG](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/). Retrieval reframed as filtering on line_df and toc_df: anchors small, context large.
*   [Finding the right anchors for RAG: keyword, embedding, and TOC signals in parallel](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/). Parallel anchor detectors: keyword always, embeddings alongside, one LLM call at the end.
*   [An LLM as arbiter in RAG retrieval: picking the right candidate with reasons](https://towardsdatascience.com/letting-an-llm-pick-the-right-rag-page-the-arbiter-pattern-at-the-end-of-retrieval/). The LLM arbiter: candidates ranked with reasons, one typed JSON out.
