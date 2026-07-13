Title: Assemble Each RAG Generation Prompt from a Base Prompt Plus the Rules Each Question Needs

URL Source: https://towardsdatascience.com/assemble-each-rag-generation-prompt-from-a-base-prompt-plus-the-rules-each-question-needs/

Published Time: 2026-07-05T15:00:00+00:00

Markdown Content:
part of the generation brick of [Enterprise Document Intelligence](https://towardsdatascience.com/document-intelligence-a-series-on-building-rag-brick-by-brick-from-minimal-to-corpus-scale/), a series that builds an enterprise RAG system from four bricks: document parsing, question parsing, retrieval, and generation. Article 8A (the answer contract) declared the typed schema family and the `ANSWER_REGISTRY` that maps each answer shape to its schema. This part builds the call that fills the contract: a `ParsedQuestion` comes in; the dispatcher picks the schema from the registry, composes the system prompt from a fixed BASE plus fragments, builds the user prompt, calls the model, and keeps the full trace. What happens to the answer after the call is Article 8C (validation).

Generation is the fourth brick. A reader landing here can pick up the first three from their own articles:

*   **Document parsing**, the PDF turned into structured tables: [Article 5A (what to read in a PDF)](https://towardsdatascience.com/beyond-extract_text-the-two-layers-of-a-pdf-that-drive-rag-quality/) and [Article 5B (the relational data model)](https://towardsdatascience.com/stop-returning-flat-text-from-a-pdf-the-relational-shape-rag-needs/).
*   **Question parsing**, the user string turned into a typed `ParsedQuestion`: [Article 6A (the thesis)](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/), [Article 6B (extraction)](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/), and [Article 6C (dispatch)](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/).
*   **Retrieval**, the passages filtered down to what should hold the answer: [Article 7A (retrieval as filtering)](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/), [Article 7B (anchor detection)](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/), and [Article 7C (the LLM arbiter)](https://towardsdatascience.com/letting-an-llm-pick-the-right-rag-page-the-arbiter-pattern-at-the-end-of-retrieval/).

![Image 1](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-21-1024x572.png)

_where this article sits in the series: Article 8 (generation), the prompt-assembly part, inside Part II (the four bricks) – Image by author_

![Image 2: 📓](https://s.w.org/images/core/emoji/17.0.2/svg/1f4d3.svg)**Runnable companion notebooks are on GitHub**: [doc-intel/notebooks-vol1](https://github.com/doc-intel/notebooks-vol1).

![Image 3](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-20-1024x658.png)

_The public companion-code repo at doc-intel/notebooks-vol1 – Image by author_

## 1. From brief to prompt: the dispatcher[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#from-brief-to-prompt-the-dispatcher)

One prompt per question shape, composed at call time. That is the dispatcher. The alternative is the mega-prompt every RAG codebase drifts into: one system prompt handling amounts, dates, lists, tables, and free text at once. It grows a new conditional clause on every call (_“if the answer is a date, use ISO 8601; if an amount, ISO 4217; if a list, one item per element…”_), the model reads all of it every time, and two months in nobody remembers which clause was added for which case.

The dispatcher we’ll build replaces that mess. **Contract**: a `ParsedQuestion` comes in; three things come out: the schema (picked from `ANSWER_REGISTRY` by `expected_answer_shape`), the system prompt (a fixed BASE plus the fragments the brief requests), and the user prompt (question + keywords + labeled passage lines). It calls the model, persists the full raw response on the trace, returns a typed result. Adding a new shape adds one fragment; adding a new constraint adds one fragment; nothing combinatorial.

![Image 4](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-19-1024x413.png)

_One ParsedQuestion in, one typed call out: the dispatcher composes the schema, the system prompt, and the user prompt, then returns the answer plus its trace – Image by author_

The alternatives we ruled out: one mega-prompt with every clause always present (wastes tokens, hard to debug when a table-formatting clause bleeds into an amount answer), or N independent per-shape prompts (cleaner per-shape, but duplicates the cross-cutting constraints (format, distinguish, must-disambiguate) across every template, and forces re-syncing on every change).

### 1.1 The brief: ParsedQuestion[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#the-brief-parsedquestion)

The dispatcher reads a `ParsedQuestion` produced by the question parsing brick. The full schema is **relational** (nested Pydantic objects, not a flat brief): keywords (typed objects, not strings), expected_answer_shape, decomposition, scope_filters, an execution plan, parsing notes, plus the two preparations for the next bricks (`retrieval: RetrievalQuery` and `generation: GenerationBrief`).

This article reads three parts of this object: `expected_answer_shape` (picks the schema and the shape fragment), `generation` (a brief carrying format constraints, disambiguation between close candidates, and values to distinguish), and `keywords` (echoed in the user prompt so the model can flag which ones appeared in the retrieved passages). The boundary is sharp: shape detection lives in question parsing; template assembly lives here.

We build `ParsedQuestion` inline below; the package’s current `src/docintel/question/parse_question.py` ships only the minimal version. The schema and the dispatcher get promoted to the package once the question parsing brick lands its full implementation.

```
class Keyword(BaseModel):
    text: str
    weight: float = 1.0
    source: Literal['direct','llm_expansion','expert_dictionary'] = 'direct'
    is_regex: bool = False

class RetrievalQuery(BaseModel):
    main_query: str
    rewrites: list[str] = []
    anchor_keywords: list[str] = []
    section_hint: str | None = None
    scope: str = 'default'

class GenerationBrief(BaseModel):
    original_question: str
    format_constraint: dict[str, str] = {}
    disambiguation: str | None = None
    must_distinguish: list[Distinction] = []

class ExecutionPlan(BaseModel):
    use_toc_navigation: bool = True
    use_keyword_retrieval: bool = True
    use_embeddings: bool = False
    iterate_on_feedback: bool = True
    max_iterations: int = 3

class ParsedQuestion(BaseModel):
    original_question: str
    keywords: list[Keyword]
    expected_answer_shape: Literal['text','amount','date','boolean','list','table']
    decomposed_subquestions: list[str] = []
    activations: ExecutionPlan = ExecutionPlan()
    parsing_notes: list[str] = []
    suggested_clarification: str | None = None
    retrieval:  RetrievalQuery
    generation: GenerationBrief
```

### 1.2 Structural hints from the question[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#structural-hints-from-the-question)

**The user’s question phrasing scopes retrieval, without any new flag on the pipeline.** When the question says _“on page 1”_, _“pages 5 to 7”_, or _“on the Pricing sheet”_, that pointer rides on `ParsedQuestion.structural_hints`. Retrieval reads it and filters the search space. No `chunk_strategy="passthrough"`, no bypass argument, no special short-doc path. The operator controls scope by writing it inside the question.

The field carries one list per format. This article is PDF-only, so `pages_hint` is the one that matters here; the sibling fields for the other formats the series reaches later stay out of scope:

```
class StructuralHints(BaseModel):
    pages_hint: list[int] | None = None  # PDF; a sheet/slide equivalent follows for later formats
```

Single, range, and list phrasings collapse to the same flat list at parse time: _“page 1”_ becomes `[1]`, _“pages 5 to 7”_ becomes `[5, 6, 7]`, _“page 2 and page 7”_ becomes `[2, 7]`. Retrieval then filters with one expression, `page_df[page_df.page_num.isin(pages_hint)]`, and does not branch on the shape of the hint. Hinted pages are kept even when no keyword matches them: the user pinned them explicitly, that is the answer surface.

The short-doc case is where this earns its keep. When the source is a CV, a one-page invoice, or a 1-2 page memo, the whole document fits in the model’s context window. The operator writes _“Extract these fields from page 1 of this CV”_, _“Read page 1 and return the invoice line items”_, _“On page 1, list every named party”_. Question parsing extracts `pages_hint=[1]`; retrieval filters `line_df` to lines on page 1 (which on a one-page doc is every line); generation reads the whole document and runs the requested schema. The pipeline shape is identical to a 1000-page corpus query that happens to land on a single page: same code, same audit chain, same contract.

The same mechanism extends to the other formats the series reaches later: a sheet name or a slide number scopes retrieval the way a page number does here. Those formats are out of scope; the point that carries over is that the scope pointer rides on the question, not on a pipeline flag.

The failure mode to avoid is the opposite move: adding keyword filtering or embedding similarity on a one-page document that does not need it, and watching the filter drop fields the LLM would have caught. The schema does the field-by-field work on the LLM’s attention; the corpus to filter is too small for any retrieval signal to add value. The structural hint in the question is the only signal the pipeline needs.

### 1.3 The system prompt: BASE + fragments[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#the-system-prompt-base-fragments)

The BASE is shape-agnostic: it encodes the contract that holds for every call: cite, type, fail honestly. The fragments are concern-specific: one per shape (`amount`, `date`, `list`, `table`, `boolean`, `text`), one per cross-cutting constraint (format, distinguish, disambiguation, decomposition). The dispatcher composes only what the brief asks for; nothing else.

Article 8A framed why this matters: the model predicts a plausible continuation, it doesn’t look anything up, so we anchor every claim to a source line number the pipeline can check rather than to prose the model can smooth over. That anchor is only as good as the number. The **`GLOBAL_LINE` rule in BASE is not boilerplate.** The first time we ran this on the Attention paper, the model returned `line_start=33` for a quote that lived at global line 267 (page 6, `line_in_page=33`). The model had picked the third column of the user-prompt passage rows instead of the first because the columns were unlabeled. Spelling it out in the system prompt and labeling the columns in the user prompt (section 1.3) made the bug go away. When a passage row carries multiple integer columns, the model will pick whichever it feels like unless you say which column holds the line number.

```
BASE = """You answer questions strictly from the provided document passages.

Rules:
- Use only information from the passages.
- Every item in `items` must carry at least one Span citing source line numbers.
- A Span is a contiguous (line_start, line_end). Use multiple Spans on one item
  when the supporting evidence is split across non-adjacent regions.
- IMPORTANT: Span.line_start and Span.line_end MUST be the GLOBAL_LINE value
  (the FIRST column of each passage row), NOT the per-page line_in_page.
- If the passages do not contain the requested answer, return items=[],
  answer_found=False, and explain in caveats what was or wasn't found.
- Set complete_answer_found=False when the answer exists but is partial.
- If passages conflict, set conflicting_evidence=True and surface in caveats.
- If a passage looks malformed (broken table, OCR garble), set context_structured=False.
"""
```

The shape fragment doesn’t _replace_ the schema choice: the schema is already enforced by `responses.parse(text_format=...)`. The fragment **steers the model’s extraction strategy**: _“return one AnswerItem per element of the list”_, _“currency MUST be valid ISO 4217”_, _“do not convert if the document quotes a different currency, set answer\_found=False instead”_. Schema enforces type at decoding; fragment steers extraction at prompt time.

```
SHAPE_FRAGMENTS = {
    "text":    "Use `text=...` per item. Stay close to source phrasing.",
    "amount":  "Fill `amount = Amount(value, currency, unit)`. ISO 4217.",
    "date":    "Fill `date = DateValue(iso, original)`. iso = YYYY-MM-DD.",
    "list":    "ONE item per element. Each item carries its own Spans.",
    "table":   "TableValue(headers, rows). Rectangular. ONE item per table.",
    "boolean": "True / False. Conditional answers go in caveats.",
}

def format_fragment(constraint: dict[str, str]) -> str | None:
    if not constraint:
        return None
    rules = []
    if "currency" in constraint:    rules.append(f"Currency MUST be {currency!r}.")
    if "period" in constraint:      rules.append(f"Period MUST be {period!r}.")
    if "date_format" in constraint: rules.append(f"Dates as {date_format!r}.")
    return "Format constraints:\n- " + "\n- ".join(rules)

def distinguish_fragment(distinctions: list[Distinction]) -> str | None:
    if not distinctions:
        return None
    lines = [f"- {d.this!r} is NOT {d.not_!r}. Return only {d.this!r}." for d in distinctions]
    return "Be careful with these distinctions:\n" + "\n".join(lines)
```

### 1.4 The dispatcher and the user prompt[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#the-dispatcher-and-the-user-prompt)

The dispatcher reads the parsed question, picks the schema from `ANSWER_REGISTRY[parsed_q.expected_answer_shape]` (or an explicit `answer_schema=...` override, for custom shapes: see section 1.5), composes BASE + the relevant fragments, and returns the `(prompt, applied)` pair. The `applied` list goes into the trace so a wrong format six months later is traceable to the exact set of fragments that were composed. Never to _“the agent decided”_.

```
def build_system_prompt(parsed_q: ParsedQuestion) -> tuple[str, list[str]]:
    parts:   list[str] = [BASE]
    applied: list[str] = ["BASE"]

    parts.append(SHAPE_FRAGMENTS[parsed_q.expected_answer_shape])
    applied.append(f"SHAPE:{parsed_q.expected_answer_shape}")

    brief = parsed_q.generation
    if frag := format_fragment(brief.format_constraint):
        parts.append(frag); applied.append("FORMAT")
    if frag := distinguish_fragment(brief.must_distinguish):
        parts.append(frag); applied.append("DISTINGUISH")
    if brief.disambiguation:
        parts.append(f"Disambiguation: {brief.disambiguation}")
        applied.append("DISAMBIGUATION")
    if parsed_q.decomposed_subquestions:
        parts.append("This question decomposes into ...")
        applied.append("DECOMPOSITION")

    return "\n\n".join(parts), applied
```

The user prompt is a thin shell: the question, the original keywords (so the model can mark which were found in passages), and the candidate lines. The column header `GLOBAL_LINE\tpage\tline_in_page\ttext` is repeated as a one-line reminder right before the data: same form the BASE rule uses, in caps. Two reminders in two places sound redundant, but they’re what fixed the per-page-vs-global numbering bug from section 1.3. Cheap insurance for a recurring failure.

```
def build_user_prompt(parsed_q: ParsedQuestion, filtered_line_df: pd.DataFrame) -> str:
    df = filtered_line_df
    if "overall_line_num" not in df.columns:
        df = df.reset_index(drop=False).rename(columns={"index": "overall_line_num"})
    lines = "\n".join(
        f"{int(r.overall_line_num)}\t{int(r.page_num)}\t{int(r.line_num)}\t{r.text}"
        for r in df.itertuples()
    )
    keyword_strs = [k.text for k in parsed_q.keywords]
    return (
        f"Question: {parsed_q.original_question}\n\n"
        f"Original query keywords: {keyword_strs}\n\n"
        "Passages (TAB-separated: GLOBAL_LINE\\tpage\\tline_in_page\\ttext).\n"
        "Cite via Span.line_start = GLOBAL_LINE (first column).\n\n"
        f"{lines}"
    )
```

**One call vs k calls:** A small architectural choice hides inside `build_user_prompt`. When retrieval returns k=3 candidate chunks, we can hand all three to the model in **one combined call**, or call the dispatcher **sequentially**, chunk by chunk, stopping the moment we have what we need.

The two modes have very different cost profiles:

*   **Combined** (one call with all k chunks). The model sees everything at once, can cross-reference across passages, emits per-passage citations naturally via `items: list[XItem]` (one item per finding, each with its own `Span`). Cost: one round-trip, with the full context size. This is the default when the answer can be **synthesized** across chunks (a list of exclusions scattered across pages, a definition plus its example footnote).
*   **Sequential with early termination** (one call per chunk, stop on success). Process chunks in retrieval rank order. After each call, check `answer_found=True`**and**`complete_answer_found=True`: if both, ship and skip the rest. Cost in the best case: one chunk’s worth of context. This is the right move when the answer is a **single fact** likely to live in one place (an amount, a date, a person’s name, a yes/no), so the top-ranked chunk almost always has it. Saves 2/3 of the tokens at k=3.

Two other cases force sequential regardless of question shape: each chunk is large enough that combining would push the context past the 70-80% margin (section 1.5), or the chunks are **heterogeneous** in a way that breaks one schema (a contract section vs its amendment vs its schedule, each with its own validation rules).

**The combined-vs-sequential decision is made upstream**, in **question parsing**, not here. Question parsing already classifies the question (`answer_shape`, `answer_type`, ambiguity, and `answer_context` for how much surrounding text to read). The routing hint sits alongside on the same `ParsedQuestion`, in a top-level `chunk_strategy: "combined" | "sequential"` field. Retrieval then reads that hint and decides what to pull (one tight anchor vs broader span). Generation, in this article, receives the final list of chunks plus the strategy, and just executes it. **All decisions are upstream; this article only runs the loop.**

**Three concrete payoffs from this composition design:**

*   **Modifying a format touches one file:** Change the rendering of amounts (always two decimals, always trailing currency) → edit `SHAPE_FRAGMENTS["amount"]`. Nothing else moves. The `Amount` type structure is enforced separately by Pydantic.
*   **Adding a constraint touches one file.** A new question type starts asking for _“the most recent value when the document gives a history”_ → add a `prefer_recent_fragment(brief.prefer_recent)`, branch in the dispatcher. Other shapes are untouched.
*   **Auditability is a free output:**`result.meta["fragments_applied"]` lists exactly which fragments were composed for this call. A wrong format six months from now is traceable to a mis-detected shape (question parsing issue) or a buggy fragment (this article’s issue).

### 1.5 Calling the model, storing the trace, custom schemas[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#calling-the-model-storing-the-trace-custom-schemas)

Temperature **0**. RAG generation is extraction, not creative writing. Reproducibility matters more than variation.

**Always persist the full raw response on the pipeline trace.** Tokens, model version, request id, finish reason, system fingerprint, anything else the SDK exposes: all of it lives in `usage`, `model`, `id`, `system_fingerprint`. Keeping only `output_text` is the bug; storing the whole payload costs a few KB per call and saves hours of forensic work later. The opposite mistake is common: estimating tokens with a local tokenizer _before_ the call. tiktoken drifts across model versions, and you burn local CPU to recompute what the API returns for free.

**Keep margin.** Cap utilization at 70-80%. Models degrade well before the hard limit: fill 127k of a 128k window and answer quality, instruction-following, and reasoning fall off together. If you’re consistently filling more than that, the problem is upstream: retrieval is returning too many passages, the schema is too large, or the question needed more aggressive scope filtering. The signal to watch is `usage["input_tokens"] / model_max_input` over a window of recent calls, **not** a one-shot pre-call estimate.

In production, the raw responses go to a `responses` table or object store keyed by request id. Six months later, when a user reports _“the answer for question X used to be different”_, you can pull the exact request, the exact response, the exact model version, and reconstruct what happened. Without the raw payload, that conversation is impossible.

```
def generate(parsed_q: ParsedQuestion, filtered_line_df, client,
             answer_schema: type[BaseModel] | None = None) -> GenerationResult:
    Answer = answer_schema or ANSWER_REGISTRY[parsed_q.expected_answer_shape]
    system, applied = build_system_prompt(parsed_q)
    user = build_user_prompt(parsed_q, filtered_line_df)
    resp = client.responses.parse(
        model=model_chat,
        input=[{"role": "system", "content": system},
               {"role": "user",   "content": user}],
        text_format=Answer,
        temperature=0.0,
        store=False,
    )
    answer = Answer.model_validate_json(resp.output_text)
    return GenerationResult(answer=answer, meta={
        "schema_used": Answer.__name__,
        "fragments_applied": applied,
        "template_version": "v1",
        "raw_response": resp.model_dump(mode="json"),
    })
```

Here’s what `result.answer` contains for the running question, _“What are the options mentioned for positional encoding?”_, running `generate(parsed_q, filtered_line_df, client)` on the [_Attention Is All You Need_](https://arxiv.org/abs/1706.03762) paper (Vaswani et al.2017; arXiv non-exclusive distribution license, declared on the [arXiv abstract page](https://arxiv.org/abs/1706.03762)). The runnable paths call OpenAI services (`gpt-4.1`, `gpt-4o-mini`), governed by [OpenAI’s Terms of Use](https://openai.com/policies/terms-of-use):

```
{
  "extraction_method": "verbatim",
  "confidence": 1.0,
  "caveats": [],
  "answer_found": true,
  "complete_answer_found": true,
  "context_completeness_weak": 1.0,
  "context_structured": true,
  "llm_discovered_keywords": ["positional encoding", "learned", "fixed", "sinusoidal", "sine and cosine", "positional embeddings"],
  "keywords_found": ["positional encoding", "learned", "fixed", "sinusoidal", "positional embeddings"],
  "conflicting_evidence": false,
  "suggested_clarification": null,
  "items": [
    {"text": "Learned positional encodings",
     "spans": [{"line_start": 165, "line_end": 165, "quote": "There are many choices of positional encodings, learned and fixed [9]."},
               {"line_start": 273, "line_end": 273, "quote": "We also experimented with using learned positional embeddings instead,"}]},
    {"text": "Fixed (sinusoidal) positional encodings",
     "spans": [{"line_start": 200, "line_end": 200, "quote": "There are many choices of positional encodings, learned and fixed [9]."},
               {"line_start": 165, "line_end": 165, "quote": "In this work, we use sine and cosine functions of different frequencies."}]}
  ]
}
```

And the trace `result.meta` saved alongside: `schema_used` confirms the registry pick, `fragments_applied` is the audit trail of the prompt composition, and `raw_response` is the OpenAI payload reduced here to the keys you’d reach for later (`model`, `id`, `usage`) plus the list of remaining top-level keys for forensic completeness:

```
{
  "schema_used": "TextAnswer",
  "fragments_applied": ["BASE", "SHAPE:list"],
  "template_version": "v1",
  "raw_response": {
    "model": "gpt-4.1",
    "id": "resp_06c182cee1f7d692016a16beb1074c8196...",
    "usage": {
      "input_tokens": 5051,
      "input_tokens_details": {"cached_tokens": 0},
      "output_tokens": 546,
      "output_tokens_details": {"reasoning_tokens": 0},
      "total_tokens": 5597
    },
    "_other_keys": ["background", "completed_at", "content_filters", "conversation", "created_at",
                    "error", "frequency_penalty", "incomplete_details", "instructions", "max_output_tokens",
                    "max_tool_calls", "metadata", "moderation", "object", "output", "parallel_tool_calls",
                    "presence_penalty", "previous_response_id", "prompt", "prompt_cache_key",
                    "prompt_cache_retention", "reasoning", "safety_identifier", "service_tier", "status",
                    "store", "temperature", "text", "tool_choice", "tools", "top_logprobs", "top_p",
                    "truncation", "user"]
  }
}
```

**The user override:** Sometimes the project has a domain-specific shape the registry doesn’t cover: the `Address` example from Article 8A (the answer contract) is exactly this case. The article’s `generate()` accepts `answer_schema=MyCustomSchema` as an override; the dispatcher uses it instead of the registry default. The custom schema must subclass `AnswerBase` so the feedback fields stay in place. In the shipped library, the equivalent surface is `pdf_fields_qa(fields=[...])` for per-field domain shapes; teams needing a fully custom answer schema today wrap `llm_answer_with_evidence` directly (the override kwarg on `pdf_qa` is a planned promotion, tracked with the registry’s move into `src/docintel/generation/`).

**The raw payload, family by family:** The LLM API returns much more than the structured answer the user sees. The JSON envelope around `content` carries three families of fields, and each one earns its place by feeding a downstream concern:

*   **Content**: the model’s output, escaped inside `output[0].content[0].text` until Pydantic parses it into a typed `AnswerBase` subclass. That’s the part that becomes the user-visible reply.
*   **Usage**: `input_tokens`, `output_tokens`, plus cache hit/miss counters. A follow-up cost & latency layer reads `usage.input_tokens` and `usage.output_tokens` to compute per-question cost; cache counts tell us how much of the prompt the provider served from its prefix cache.
*   **Trace**: `id`, `model`, `created_at`, `status`. A follow-up security audit reads `id` and `model` to reproduce a past answer six months later, when the user reports _“the answer for question X used to be different”_.

**The rule**: never persist only `content`. A follow-up storage layer details the `llm_response` table that holds this JSON verbatim. A few extra bytes per request, whole categories of analysis the team can run later instead of guess at.

```
{
  "id": "resp_063b40a2e3406595016a0c4d62ee3c8195",
  "object": "response",
  "created_at": 1742832000,
  "model": "gpt-4o-mini-2024-07-18",
  "status": "completed",
  "output": [
    {"type": "message", "role": "assistant",
     "content": [{"type": "output_text",
                  "text": "{\"items\": [{\"text\": \"Learned positional encodings\", \"spans\": [{\"line_start\": 266, \"line_end\": 266, \"quote\": \"There are many choices of positional encodings, learned and fixed [9].\"}]}, ...], \"answer_found\": true, \"complete_answer_found\": true, \"confidence\": 0.9, \"caveats\": [], \"extraction_method\": \"verbatim\", \"keywords_found\": [\"positional\", \"encoding\"], \"conflicting_evidence\": false, \"suggested_clarification\": null}"}]}
  ],
  "usage": {
    "input_tokens": 2347,
    "input_tokens_details": {"cached_tokens": 1850},
    "output_tokens": 412,
    "output_tokens_details": {"reasoning_tokens": 0},
    "total_tokens": 2759
  }
}
```

## 2. Per-field evidence: the escalation path[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#per-field-evidence-the-escalation-path)

**When the answer is twenty typed fields instead of one sentence, push the `AnswerWithEvidence` wrapper down to the field level.** The schema becomes a Pydantic class whose every field is a `FieldExtraction[T]`: each carries its own typed value plus the span the model read it from. The LLM fills the whole tree in one structured call; downstream code reads `profile.email.value` for the field and `profile.email.page / line_start / line_end` for the citation. The single-claim `AnswerWithEvidence` stays the default; this is the escalation path for multi-field extraction in regulated contexts (HR triage, credit decisions, healthcare intake, invoice ingestion).

The series already does this at the **item** level. `AddressItem` from Article 8A (the answer contract) wraps an `Address` value with its `spans`. `AmountItem` wraps an `Amount` with its `spans`. `DateItem` wraps a `DateValue` with its `spans`. The item is _value plus where the value was read_. The same pattern, applied at the **field** level rather than the list-element level, is what this section makes explicit.

### 2.1 Three naive shapes that break[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#three-naive-shapes-that-break)

The first reflex is **one call per field**. Each call is a `qa.ask(pdf, "what's the candidate's email?", response_format=str)`. Audit is clean (one log line per field) but the document context is sent N times and the bill scales linearly. On a one-page CV with many fields, this is the most expensive shape that exists.

The second reflex is **one call returning a flat JSON without evidence**. `{name: "...", email: "...", phone: "..."}`. The cost drops by a factor of N because the document is sent once. The provenance disappears entirely; a wrong field cannot be traced back to a specific line. A candidate who appeals has no answer to _which line of my CV did the model read?_

The third reflex is **one call with a top-level evidence block**. `{profile: {...all fields...}, spans: [...]}`. Better, but the citation is per-answer, not per-field. The reviewer sees a list of pages but cannot map _“this page backs the email”_ to _“that page backs the current role”_. When a single field is wrong, the whole evidence block becomes suspect.

None of the three extends `AnswerWithEvidence` honestly. The right move is to push the wrapper down to the field level.

### 2.2 The pattern: a wrapper per field[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#the-pattern-a-wrapper-per-field)

The primitive is a generic Pydantic class that wraps a typed value with its own evidence:

```
from typing import Generic, TypeVar
from pydantic import BaseModel, Field
T = TypeVar("T")

class FieldExtraction(BaseModel, Generic[T]):
    """Per-field analogue of AnswerWithEvidence. Each field carries
    its own typed value plus the span the LLM read it from."""
    value: T | None = Field(..., description="Typed value or null if not found.")
    quote: str = Field(default="", description="Verbatim line(s) from the parsed source.")
    page: int | None = Field(default=None)
    line_start: int | None = Field(default=None)
    line_end: int | None = Field(default=None)
    found: bool = Field(default=True)
    caveat: str = Field(default="")
```

The output schema becomes a Pydantic class whose every field is a `FieldExtraction[T]` instance. The LLM fills the whole tree in one structured call. For the CV case from a bonus article on rule-based fields:

```
class CandidateProfile(BaseModel):
    name:          FieldExtraction[str]
    email:         FieldExtraction[str]
    phone:         FieldExtraction[str]
    linkedin_url:  FieldExtraction[str]
    current_role:  FieldExtraction[str]
    years_experience: FieldExtraction[int]
    # ... and so on, twenty-odd fields
```

Downstream code reads `profile.email.value` for the field and `profile.email.page / line_start / line_end` for the citation. The bbox highlighter from Article 8C (validation) runs per field rather than per request; each field gets its own yellow rectangle. The audit log writes one row per field if it wants to, one row per request if it does not. Same primitive, two granularities.

### 2.3 Verify the citations, per field[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#verify-the-citations-per-field)

The post-LLM work is where a JSON becomes a trustworthy object: `model_validate_json` parses it, field-level validators enforce domain formats, and a `model_validator(mode="after")` fills any derived fields. The layer that earns its keep here is **verify**. For every `FieldExtraction[T]` whose `value is not None`, the `quote` must actually appear (modulo whitespace) somewhere in the parsed source. A hallucinated citation reads plausibly to a reviewer but does not exist on the page. The verifier walks the schema, substring-checks each `quote` against the parsed lines, and flags every one that does not appear. Cheap, and it catches the failure mode enterprises fear most: the model invented a justification. It is the per-field version of the validator built in Article 8C (validation).

```
def verify_citations(profile: BaseModel, line_df: pd.DataFrame) -> list[str]:
    """Return a list of (field_path, quote) for citations that don't appear
    in line_df. Empty list = every cited quote is in the source."""
    flat = " ".join(line_df["text"].astype(str)).lower()
    misses = []
    for field_path, field in _walk_fields_of_type(profile, FieldExtraction):
        if field.value is None or not field.quote:
            continue
        if field.quote.lower().strip() not in flat:
            misses.append((field_path, field.quote))
    return misses
```

A profile that returns with `misses == []` is safer than the same profile returned without the check. A profile that returns with two or three hallucinated quotes is one the reviewer must read alongside the source. The failure mode is exactly the one the feedback loop of Article 8C (validation) already handles, applied per field.

The rest of the multi-field story is its own topic and lives in a dedicated bonus article: decomposing a value into typed slots so a SQL filter can hit it (`postcode` as its own field, not buried in an address string), computing derived fields after the LLM read the raw one (an ISO country code from _“Italian”_), coalescing mixed-shape questions behind one `qa.ask(...)` entry point, and mixing this LLM extraction with rule-based fields for regulated cases (HR triage, credit decisions, healthcare intake). The piece that belongs to generation is the one above: push the evidence wrapper down to the field level, then verify every quote against the source.

## 3. Dynamic few-shot: retrieval applied to the prompt[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#dynamic-few-shot-retrieval-applied-to-the-prompt)

One more fragment, added at query time: the validated examples closest to the new question, pulled from a bank and dropped into the prompt before the call. It is an FAQ turned toward the model. A classic FAQ prepares Q&A pairs for people; this bank prepares them for the model, aimed at the answer format and the tricky extractions. The mechanism reuses the retrieval brick. The dispatcher of section 1 assembles the prompt from BASE plus build-time fragments; here one more fragment is added at query time: the examples closest to the new question, pulled from a bank and dropped into the prompt before the call. The same `retrieve_pages` runs against `example_bank_df` instead of the corpus’s `line_df`, returning 3-5 examples (more dilutes the new question). The bank grows as the team curates validated examples; the prompt picks them up on the next query, no deploy needed.

![Image 5](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-22-1024x608.png)

_the same idea as a FAQ, turned toward the model: prepared examples, retrieved by similarity, injected before the call – Image by author_

### 3.1 One example, start to finish[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#one-example-start-to-finish)

Take a concrete failure. A user asks _“what is the annual premium?”_ on a contract whose line 212 prints the premium with a dollar sign (`$1,850.50`). With no example, the model copies the source too literally: it returns the currency as `"$"` instead of the ISO-4217 code `"USD"`. The rules are all in BASE, but the model still slips on the symbol-versus-code formatting.

The bank holds past questions the team already answered and checked, one row each: the question text, the validated answer JSON, and a few tags. Retrieval (against the question text, with the same embedder the corpus uses) pulls the closest past row, where exactly that normalization was already settled:

```
{
  "question": "What was last year's premium?",
  "answer_json": {
    "answer_type": "amount",
    "items": [
      {"amount": {"value": 1850.5, "currency": "USD"},
       "spans": [{"line_start": 212, "line_end": 212,
                  "quote": "Annual premium: $1,850.50"}]}
    ],
    "answer_found": true
  },
  "tags": ["amount", "premium", "usd"]
}
```

The dispatcher drops that row into the user prompt as a worked example, right before the new question:

```
Here is a past answer in the exact shape expected.

Q: What was last year's premium?
   (source line: "Annual premium: $1,850.50")
A: {"answer_type": "amount",
    "items": [{"amount": {"value": 1850.5, "currency": "USD"},
               "spans": [{"line_start": 212, "line_end": 212}]}],
    "answer_found": true}

Now answer this question in the same shape.
Q: What is the annual premium?
```

The example does the teaching. It pairs a messy source (`$1,850.50`) with the clean validated answer (`value 1850.5`, `currency "USD"`), so the model copies that exact mapping instead of re-deriving it from a rules paragraph it just demonstrably ignored. The same row also carries the `items`/`spans` nesting and the `answer_found` flag by demonstration.

### 3.2 Three places it pays[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#three-places-it-pays)

Each example is worth its tokens only when it prevents a specific, recurring mistake:

*   **Format examples** fix normalization slips. The premium case above: a clean past amount stops the model from returning `"$"` for the currency instead of the ISO code `"USD"`. Reach for one whenever the source format and the target format differ and the model keeps copying the source.
*   **Extraction examples** fix a behaviour. An IBAN printed across two lines, with a past row that joined the halves into one value, stops the model returning only the first line. The example is the spec for _how_ to extract, not just _what_ shape to return.
*   **Question-parsing examples** fix disambiguation. A past vague question with its resolved parse (_“the warranty bit”_ → `target_field="warranty_duration"`) shows a new vague question which field to land on, instead of guessing `warranty_terms` or `warranty_exclusions`.

The cost is real, so keep it conditional. Skip the fragment when there is no bank yet, when the new question is unlike anything in the bank (an out-of-distribution pull adds noise, not signal), or when the bank holds sensitive data the prompt should not carry. The bonus article on FAQ-as-RAG develops the extreme version, where the entire corpus _is_ the example bank.

## 4. Conclusion[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#conclusion)

A `ParsedQuestion` in, a typed call out: the registry picks the schema, BASE plus fragments compose the system prompt, the user prompt carries the question, the keywords, and the labeled passage lines, and the trace records every decision so a wrong format six months later is traceable to the exact set of fragments. Nothing here trusts the model yet. The answer that comes back is checked against the contract of Article 8A (the answer contract) by Article 8C (validation) before anyone reads it.

## 5. Sources and further reading[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_B_prompt.html#sources-and-further-reading)

The dispatcher composes the prompt at build time from typed parts; the literature’s main alternative hands that control to the model at runtime. Reading the two side by side is the best way to see what the engineered switch buys (reproducibility, bounded cost, an auditable trace) and what it gives up (open-ended flexibility). The agentic line, runtime tool-picking on top of this dispatcher, is follow-up work beyond this series.

**Same direction as the article:**

*   Mialon et al., _Augmented Language Models: a Survey_, 2023 ([arXiv:2302.07842](https://arxiv.org/abs/2302.07842)). Survey of the augmented-LLM design space. Useful overview to read alongside the dispatcher pattern.

**Different angle, different context:**

*   Yao et al., _ReAct: Synergizing Reasoning and Acting in Language Models_, ICLR 2023 ([arXiv:2210.03629](https://arxiv.org/abs/2210.03629)). The agent picks tools at runtime: the LLM decides when to call retrieval, what to retrieve, and when to stop. The opposite end of the control spectrum from this article’s build-time fragments.
*   Schick et al., _Toolformer: Language Models Can Teach Themselves to Use Tools_, NeurIPS 2023 ([arXiv:2302.04761](https://arxiv.org/abs/2302.04761)). The model decides inline which tool to call, with no upfront assembly. Same trade-off as ReAct: flexibility against reproducibility and bounded cost.

**Earlier in the series:**

*   [Document Intelligence: series intro](https://towardsdatascience.com/document-intelligence-a-series-on-building-rag-brick-by-brick-from-minimal-to-corpus-scale/). What the series builds, brick by brick, and in what order.

_What works, what breaks_

*   [Baseline Enterprise RAG, from PDF to highlighted answer](https://towardsdatascience.com/baseline-enterprise-rag-from-pdf-to-highlighted-answer-enterprise-document-intelligence-vol-1-1/). The four-brick pipeline end to end: PDF in, highlighted answer out.
*   [Embeddings Aren’t Magic: The Predictable Failure Modes of RAG Retrieval](https://towardsdatascience.com/embeddings-arent-magic-the-predictable-failure-modes-of-rag-retrieval-enterprise-document-intelligence-vol-1-2/). Where embedding similarity wins (synonyms, typos, paraphrase), where it predictably breaks (unknown terms, negation, term-vs-answer relevance), and how to use it anyway. 
    *   [Rerankers Aren’t Magic Either: When the Cross-Encoder Layer Is Worth the Cost](https://towardsdatascience.com/rerankers-arent-magic-either-when-the-cross-encoder-layer-is-worth-the-cost-enterprise-document-intelligence-vol-1-2bis/). What a cross-encoder adds over bi-encoder embeddings, measured, and when it is worth the latency.

*   [RAG is not machine learning, and the ML toolkit solves the wrong problem](https://towardsdatascience.com/rag-is-not-machine-learning-and-the-ml-toolkit-solves-the-wrong-problem/). Why chunk-size sweeps and finetuning optimize the wrong thing; route by question type instead.
*   [From regex to vision models: which RAG technique fits which problem](https://towardsdatascience.com/from-regex-to-vision-models-which-rag-technique-fits-which-problem/). Two axes, document complexity and question control, that pick the technique for each case. 
    *   [10 common RAG mistakes we keep seeing in production](https://towardsdatascience.com/10-common-rag-mistakes-we-keep-seeing-in-production/). Ten production mistakes, organized brick by brick, with the fix for each.

_Document parsing_

*   [Beyond extract_text: the two layers of a PDF that drive RAG quality](https://towardsdatascience.com/beyond-extract_text-the-two-layers-of-a-pdf-that-drive-rag-quality/). The first half of the parsing brick: the document’s nature, signals, and summary.
*   [Stop returning flat text from a PDF: the relational tables RAG needs](https://towardsdatascience.com/stop-returning-flat-text-from-a-pdf-the-relational-shape-rag-needs/). The second half of the parsing brick: the relational tables every downstream brick reads. 
    *   [When PyMuPDF can’t see the table: parse PDFs for RAG with Azure Layout](https://towardsdatascience.com/when-pymupdf-cant-see-the-table-parse-pdfs-for-rag-with-azure-layout/). The same tables from Azure Layout: native table cells, OCR, paragraph roles.
    *   [Parse PDFs for RAG locally with Docling: rich tables, no cloud upload](https://towardsdatascience.com/parse-pdfs-for-rag-locally-with-docling-rich-tables-no-cloud-upload/). The same tables computed locally with Docling: TableFormer cells, nothing leaves the machine.
    *   [Vision LLMs are PDF parsers too: reading charts and diagrams for RAG](https://towardsdatascience.com/vision-llms-are-pdf-parsers-too-reading-charts-and-diagrams-for-rag/). Vision as a parser: the pictures become searchable text.
    *   [Parse scanned PDFs for RAG with EasyOCR: free OCR gives you words, not a document](https://towardsdatascience.com/parse-scanned-pdfs-for-rag-with-easyocr-free-ocr-gives-you-words-not-a-document/). Where traditional OCR stops: text recovered, structure lost.
    *   [Making a PDF’s images searchable for RAG, without paying to read them all](https://towardsdatascience.com/making-a-pdfs-images-searchable-for-rag-without-paying-to-read-them-all/). The image cascade: filter cheap, classify, describe only what is worth reading.
    *   [Reconstructing the table of contents a PDF forgot to ship, so RAG can scope by section](https://towardsdatascience.com/reconstructing-the-table-of-contents-a-pdf-forgot-to-ship-so-rag-can-scope-by-section/). Rebuilding toc_df when the PDF prints a contents page but ships no outline.

_Question parsing_

*   [RAG questions need parsing too: turn the user’s string into briefs for retrieval and generation](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/). The thesis of question parsing: why a user string needs the same parsing as a document, and how it splits into a retrieval brief and a generation brief.
*   [What the question parser extracts from a user string: keywords, scope, shape, decomposition, clarification](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/). The five families of columns the parser reads straight from the user’s question, with the code that fills each one.
*   [Dispatching the parsed RAG question: chunk strategy, model tier, activations, audit](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/). The decisions the parser makes on top of the user string, using the document’s profile: dispatch, activations, full schema, the audit trail (pipeline_trace.json), and a broker-corpus walkthrough. 
    *   [The Clarification Loop and Learned Defaults: When the Question Is Not Precise Enough](https://towardsdatascience.com/when-rag-users-ask-vague-questions-clarify-once-learn-the-default/). One focused clarification when the question is too vague, and the default learned from the answer.

_Retrieval_

*   [Retrieval is filtering, not search: a mental model for enterprise RAG](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/). Retrieval reframed as filtering on line_df and toc_df: anchors small, context large.
*   [Anchor detection for RAG: parallel detectors, then one LLM call at the end](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/). Parallel anchor detectors: keyword always, embeddings alongside, one LLM call at the end.
*   [Letting an LLM pick the right RAG page: the arbiter pattern at the end of retrieval](https://towardsdatascience.com/letting-an-llm-pick-the-right-rag-page-the-arbiter-pattern-at-the-end-of-retrieval/). The LLM arbiter: candidates ranked with reasons, one typed JSON out. 
    *   [A structure for context engineering: the four typed pieces behind every RAG answer](https://towardsdatascience.com/context-engineering-for-rag-the-four-typed-inputs-behind-every-rag-answer/). Context engineering given a structure: the four typed pieces (fixed system prompt, retrieved lines, doc-context block, PromptContext wrapper) that fill one single-document RAG LLM call.
