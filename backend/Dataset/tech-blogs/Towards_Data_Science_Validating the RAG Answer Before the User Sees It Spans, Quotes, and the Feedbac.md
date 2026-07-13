Title: Validating the RAG Answer Before the User Sees It: Spans, Quotes, and the Feedback Loop

URL Source: https://towardsdatascience.com/validating-the-rag-answer-before-the-user-sees-it-spans-quotes-and-the-feedback-loop/

Published Time: 2026-07-06T13:30:00+00:00

Markdown Content:
the generation brick of [Enterprise Document Intelligence](https://towardsdatascience.com/document-intelligence-a-series-on-building-rag-brick-by-brick-from-minimal-to-corpus-scale/), a series that builds an enterprise RAG system from four bricks: document parsing, question parsing, retrieval, and generation. Article 8A (the answer contract) declared the typed answer schema; Article 8B (prompt assembly) built the dispatcher that calls the model against it. This part is about what happens after the model answers: the validator that checks spans, quotes, and formats; _not found_ as a first-class output; the join that lifts citations to rectangles on the PDF; and the feedback loops that turn generation from a terminal step into a step the pipeline can react to.

Generation is the fourth brick. A reader landing here can pick up the first three from their own articles:

*   **Document parsing**, the PDF turned into structured tables: [Article 5A (what to read in a PDF)](https://towardsdatascience.com/beyond-extract_text-the-two-layers-of-a-pdf-that-drive-rag-quality/) and [Article 5B (the relational data model)](https://towardsdatascience.com/stop-returning-flat-text-from-a-pdf-the-relational-shape-rag-needs/).
*   **Question parsing**, the user string turned into a typed `ParsedQuestion`: [Article 6A (the thesis)](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/), [Article 6B (extraction)](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/), and [Article 6C (dispatch)](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/).
*   **Retrieval**, the passages filtered down to what should hold the answer: [Article 7A (retrieval as filtering)](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/), [Article 7B (anchor detection)](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/), and [Article 7C (the LLM arbiter)](https://towardsdatascience.com/letting-an-llm-pick-the-right-rag-page-the-arbiter-pattern-at-the-end-of-retrieval/).

![Image 1](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-24-1024x572.png)

_where this article sits in the series: Article 8 (generation), the validation part, inside Part II (the four bricks) – Image by author_

![Image 2: 📓](https://s.w.org/images/core/emoji/17.0.2/svg/1f4d3.svg)**Runnable companion notebooks are on GitHub**: [doc-intel/notebooks-vol1](https://github.com/doc-intel/notebooks-vol1).

![Image 3](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-25-1024x658.png)

_The public companion-code repo at doc-intel/notebooks-vol1 – Image by author_

## 1. Trust but verify[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#trust-but-verify)

A typed answer is not a checked answer. Structured output is the **start** of validation, not the end. The model still cites lines outside the input range, paraphrases quotes it swore were verbatim, sets `complete_answer_found=True` on a partial answer, and returns shapes the brief didn’t ask for.

The fix is **post-generation validation**. The validator takes the parsed question alongside the answer so it can flag shape mismatches against what was requested. Three checks combine:

*   **Shape**: the returned answer must be an instance of the schema the registry picked for the brief, with `items` populated when `answer_found=True`.
*   **Evidence**: every `Span` must reference a real line range, every quote must be a substring of the cited lines after a tolerant whitespace + bibliographic-refs normalization.
*   **Format**: ISO 8601 for dates, ISO 4217 for currencies, etc.

### 1.1 The validator[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#the-validator)

Below is the implementation. Notice the per-item, per-span loop: each problem is reported individually so the failure mode is visible at a glance (a wrong span on item 2 doesn’t hide a wrong currency on item 3).

```
def validate_answer(answer: AnswerBase, line_df: pd.DataFrame,
                    parsed_q: ParsedQuestion | None = None) -> list[str]:
    errors: list[str] = []
    valid_lines = set(line_df["overall_line_num"].values)

    if parsed_q is not None:
        ExpectedSchema = ANSWER_REGISTRY[parsed_q.expected_answer_shape]
        if not isinstance(answer, ExpectedSchema):
            errors.append(f"shape mismatch: {ExpectedSchema.__name__} expected")

    if bool(answer.items) != answer.answer_found:
        errors.append(f"answer_found mismatch len(items)={len(answer.items)}")

    for i, item in enumerate(answer.items):
        if not item.spans:
            errors.append(f"item[{i}] has no spans")
        for j, sp in enumerate(item.spans):
            if sp.line_start not in valid_lines:
                errors.append(f"line_start {sp.line_start} not in input")
            if sp.line_end < sp.line_start:
                errors.append(f"line_end before line_start")
            if sp.quote:
                cited = _join_cited_lines(line_df, sp)
                if _normalize(sp.quote) not in _normalize(cited):
                    errors.append(f"quote not verbatim in cited lines")

        if (date := getattr(item, "date", None)) is not None:
            if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date.iso):
                errors.append(f"date.iso not YYYY-MM-DD")
        if (amt := getattr(item, "amount", None)) is not None:
            if not re.fullmatch(r"[A-Z]{3}", amt.currency):
                errors.append(f"currency not ISO 4217")

        if answer.extraction_method == "verbatim" and not any(sp.quote for sp in item.spans):
            errors.append(f"verbatim but no quote")
    return errors
```

**One axis the loop doesn’t cover: fields against each other.** Every check above reads one field at a time. The next category is cross-field: constraints where two fields have to agree. A contract’s `start_date` must precede its `end_date`; the line items of an invoice must sum to its stated `total`. The schema hints at where this bites: a value with `extraction_method="computed"` (a total the model added up rather than read off the page) is exactly what should be reconciled against its parts. Declare the constraints on the schema and run them in the same pass, appending to the same `errors` list: _end\_date 2024-12-01 precedes start\_date 2025-01-01_, _line items sum to 350, stated total is 400_. A mismatch is not a parsing artifact, it is a number the user must not trust. (Consistency across _different_ documents is a corpus-scale problem, left to a later article.)

### 1.2 Verbatim is harder than it sounds[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#verbatim-is-harder-than-it-sounds)

Run the validator on the actual model output for the [_Attention Is All You Need_](https://arxiv.org/abs/1706.03762) paper (Vaswani et al.2017; arXiv non-exclusive distribution license) and the _“quote not verbatim”_ check fires on real, subtle citation mistakes (not just whitespace artifacts). Three recurring causes:

*   **Whitespace and bibliographic refs:** The PDF parser splits one logical paragraph into 5-10 physical lines; the model rebuilds it as one string with single spaces. Source lines often carry `[9]`-style refs the model strips. Both look _“wrong”_ but are semantically faithful. The `_normalize_for_quote_check` above (collapse whitespace, drop `[N]`) covers these.
*   **Adjacent-line conflation:** The model picks the wrong line number for a quote, often pointing at the line _after_ the quote ends. On the running example, the model claimed _“There are many choices of positional encodings, learned and fixed [9].”_ sat at global line 267, when it spanned 265-266; line 267 carries the next sentence (_“In this work, we use sine and cosine functions…”_). Off-by-one or off-by-two on multi-line text. The validator catches it; the model doesn’t notice.
*   **Truncated multi-line spans:** The model gives `line_start=line_end=275` for a quote that wraps across 275-276. The first half of the quote is on the cited line; the second half isn’t. Substring fails, correctly.

The first cause is harmless (semantic faithfulness intact); the next two are real failures the validator catches because the prompt didn’t. This is the substring check doing the real work: the model stated the quote with the same confidence whether or not the words are on the page, and the check catches the unsupported one before it reaches the user.

![Image 4](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-26-1024x1015.png)

_Cited lines vs the model’s claim: where substring + normalize lets bugs through – Image by author_

The strict version of the substring check still has its place when your corpus is pre-normalized (extracted clauses from a contracts database, for example) and any whitespace drift would itself be a bug worth catching. For PDF-derived corpora, normalization on whitespace and refs is the right floor; line-number precision stays under the validator’s eye.

### 1.3 When validation fails: three options[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#when-validation-fails-three-options)

When validation fails, the pipeline has options:

*   **Retry** with a stricter prompt or a different model.
*   **Flag for review**: return the answer with a warning.
*   **Reject**: refuse to return the answer to the user.

Which option you pick depends on the context. For low-stakes interactive use, retry. For audit-critical paths (legal, compliance, financial), reject and require human review. The retry path matters beyond the individual call: rejected outputs never reach the user, so the _delivered_ paraphrase rate drops to whatever survives the substring check, even if the model’s raw rate is unchanged.

To see all three options at work, the demo below builds a deliberately bad `AmountAnswer` that exercises four defects at once: shape mismatch (the running brief asked for `list` = TextAnswer/ListAnswer), span outside input range, currency that isn’t ISO 4217, verbatim claim with no quote on any span. The validator reports each. In a production pipeline this answer would be rejected; in a lower-stakes context it would be retried with a stricter prompt.

### 1.4 “Not found” as a first-class output[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#not-found-as-a-first-class-output)

In enterprise RAG, returning the wrong answer is worse than returning no answer. A wrong answer in an insurance contract can mislead a claims handler. A wrong answer in a regulatory filing can result in a compliance violation. A wrong answer about a non-compete clause can cost a deal. A _“not found”_ forces the user to look further, which is the right behavior when the system doesn’t have the answer.

**Three things make _“not found”_ work properly:**

1.   **The schema permits it cleanly:**`items=[]`, `answer_found=False`, no fake citations and no fake values. An empty `items` list is the structured way to say _“I don’t know”_: no text to misread, no spans to chase, no value to render.
2.   **The system prompt requires it:** Explicit instruction in BASE: _“If the passages do not contain the requested answer, return items=[], answer\_found=False, and explain in caveats what was or wasn’t found.”_ This isn’t optional. Without it, models default to producing something even when nothing supports it.
3.   **Downstream code distinguishes NA from a real answer.** Checking `len(answer.items) == 0` is enough. The application doesn’t render an empty answer as a real one. It says _“the document doesn’t appear to contain this information”_ clearly, without dressing it up.

The hardest part isn’t the technical implementation. It’s the **cultural willingness to accept that _“not found”_ is a correct outcome**. Teams under pressure to produce _“smart”_ answers often optimize for low NA rates, which is exactly the wrong incentive. **A high NA rate on questions whose answers aren’t in the corpus is a sign the system is honest. A low NA rate on the same questions is a sign it’s hallucinating.**

```
# NA path: off-topic question on the Attention paper. The BASE rule triggers cleanly:
# items=[], answer_found=False, caveats explain what was not found. No fabricated number.
missing_q = ParsedQuestion(
    original_question="What is the company's annual revenue in 2024?",
    keywords=[Keyword(text="revenue"), Keyword(text="2024")],
    expected_answer_shape="amount",
    retrieval=RetrievalQuery(main_query="revenue 2024"),
    generation=GenerationBrief(
        original_question="What is the company's annual revenue in 2024?",
        format_constraint={"currency": "USD"},
    ),
)
missing_result = generate(missing_q, filtered_line_df, client)
a = missing_result.answer
print("schema used :", missing_result.meta["schema_used"])
print("items       :", a.items)
print("answer_found:", a.answer_found)
print("caveats     :", a.caveats)
print("validation  :", validate_answer(a, line_df_overall, missing_q))
```

### 1.5 Shape mismatch: when the requested form can’t be supplied[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#shape-mismatch-when-the-requested-form-cant-be-supplied)

A specific case sits between _“answer found”_ and _“not found”_: the question expects a typed shape, but the document only carries a softer form. _“What’s the premium?”_ expects an `Amount(value, currency)`. The document says _“pricing is negotiated case-by-case”_. There’s information, just not in the shape that was asked for. Three options to handle this, each with a real cost:

**Option 1, silent downgrade to text:** Set the schema to `TextAnswer`, put the prose answer in `items[0].text`, drop the original `expected_answer_shape`. The user gets _something_. Downstream code that expects an `Amount` breaks (the application was rendering a price tag and now gets a sentence). The mismatch is invisible: nothing in the output flags that the shape was downgraded. The bug shows up in production when a chart shows a string where a number should be.

**Option 2, explicit NA with caveats:** Keep the requested schema (e.g.`AmountAnswer`), set `items=[]`, `answer_found=False`, `complete_answer_found=False`. Put the prose explanation in `caveats`: _“Document mentions pricing is negotiated case-by-case but does not give a specific amount.”_ Downstream code sees `answer_found=False` and renders the _“not found”_ path, showing the caveat to the user. The user knows the system tried, knows what was found, and knows what’s missing. **No silent breakage, no fake value.**

**Option 3, force the shape with a default value.** Set `items[0].amount = Amount(value=0, currency="EUR")`. Convenient for downstream code (always typed), catastrophic for everything else. The validator can’t tell a real `0 EUR` (a free service) from a _“we couldn’t extract a value”_`0 EUR`. Audit trails get polluted with phantom zeros. **Don’t.**

**The series picks Option 2:** The cost is that downstream code must handle `answer_found=False` explicitly. The benefit is that no information is silently lost: the validator can flag the mismatch (section 1.1), the audit log carries the caveat, and the user never sees a fabricated number. The schema’s `answer_found` and `complete_answer_found` fields exist precisely so the pipeline can branch cleanly on these cases without inferring intent from missing data.

The dispatcher’s shape fragments (Article 8B, prompt assembly) reinforce this rule in the system prompt: _“If the document gives the value without a currency, set answer\_found=False and add a caveat. Do NOT guess.”_ The model is told what to do with the mismatch; the schema gives it a way to say so; the validator catches the cases where it didn’t.

```
# Shape mismatch: ask for a date the paper does NOT carry. Expect items=[],
# answer_found=False, explanatory caveats. Option 2 from the shape-mismatch section:
# no silent downgrade, no phantom date. The DateAnswer schema is still returned.
date_q = ParsedQuestion(
    original_question="On what calendar date was multi-head attention with 8 heads first deployed in production at Google?",
    keywords=[Keyword(text="multi-head attention"), Keyword(text="deployment")],
    expected_answer_shape="date",
    retrieval=RetrievalQuery(main_query="multi-head attention deployment date"),
    generation=GenerationBrief(
        original_question="On what calendar date was multi-head attention with 8 heads first deployed in production at Google?",
        format_constraint={"date_format": "YYYY-MM-DD"},
    ),
)
date_result = generate(date_q, filtered_line_df, client)
a = date_result.answer
print("schema used          :", date_result.meta["schema_used"])
print("items                :", a.items)
print("answer_found         :", a.answer_found)
print("complete_answer_found:", a.complete_answer_found)
print("caveats              :", a.caveats)
print("validation           :", validate_answer(a, line_df_overall, date_q))
```

### 1.6 Lifting citations to bboxes[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#lifting-citations-to-bboxes)

**Line numbers scroll the document. A rectangle lands on the answer.** The bbox-join is what turns a citation into something the viewer can paint on the PDF. It is the split the whole brick runs on: the model’s output is pure structured data (line numbers here), and every displayed element, the quoted text and the box, is recovered afterward from the source tables. The schema work of Article 8A (the answer contract) stops at line numbers, and those come in two flavours across this brick: the rich contract’s `Span` uses the **global**`line_start` / `line_end`, while the minimal `AnswerWithEvidence` carries the page-scoped `start_page_num` / `start_line_num` / `end_page_num` / `end_line_num`. Either form tells the pipeline which lines the model leaned on. Neither is enough for the UI to _show_ them. The join below maps whichever it gets back to `line_df` rows. A viewer next to a PDF wants a `Box` of `(page, x0, y0, x1, y1)` it can paint as a yellow overlay.

The bridge is a **post-generation join** with `line_df`. The parser already emitted `(x0, y0, x1, y1)` per line at parsing time; the LLM picks line numbers here; the join is one DataFrame filter:

> **In:**`line_df` (cached from parsing) + a citation `(page, line_start, line_end)`. **Out:** a list of `Box(page, x0, y0, x1, y1)` ready for the viewer overlay.

```
def bboxes_for_citation(line_df, *, page, line_start, line_end,
                        mode="union", image_df=None):
    matched = line_df[
        (line_df["page_num"] == page)
        & (line_df["line_num"] >= line_start)
        & (line_df["line_num"] <= line_end)
    ]
    if matched.empty:
        return []
    if mode == "union":
        return [{
            "page": page,
            "x0": float(matched["x0"].min()),
            "y0": float(matched["y0"].min()),
            "x1": float(matched["x1"].max()),
            "y1": float(matched["y1"].max()),
        }]
    return [
        {"page": page, "x0": float(r["x0"]), "y0": float(r["y0"]),
         "x1": float(r["x1"]), "y1": float(r["y1"])}
        for _, r in matched.sort_values("line_num").iterrows()
    ]
```

Two modes worth shipping:

*   **union** (default) gives the envelope of all cited lines on the page: one box, fits 95% of citations where the answer span is contiguous and single-column. Cheap on the wire, easy on the viewer.
*   **per_line** gives one box per line, useful when the citation crosses a column break or wraps around an embedded image. The envelope would cover the gap, the per-line list does not.

The optional `image_df` argument is what makes figure citations work. The parser produces an `image_df` alongside the `line_df`, one row per embedded image with the same `(page, x0, y0, x1, y1)` shape. When the citation’s line range overlaps an image vertically on the same page, that image’s bbox is merged into the result: in `union` mode the envelope stretches to cover the figure plus its caption; in `per_line` mode the image is appended as an extra box. The reader who clicks on a citation that points at _“see Figure 3”_ lands on the figure, not just on the caption line.

The function lives in `src/docintel/generation/citation_bbox.py`. The cross-document variant (`corpus_pdf_qa`, a follow-up pipeline) does the same join, but on the original document’s `line_df`, not on the aggregated context the LLM saw. Synthetic page numbers from aggregation are remapped to `(document_id, original_page)` before the lookup, so the bbox points at the source PDF, not the prompt’s reading order.

Why this earns a section and not a footnote: the whole chain the generation articles built (schema, dispatcher, validation, feedback) is invisible to the user unless the viewer can land a rectangle on the page. The join is twenty lines, and those twenty lines are what turn a structured answer into something the reader can verify with their eye.

## 2. Closing the loop[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#closing-the-loop)

Most RAG diagrams end at `generate → respond`. The richer schema makes generation talk back: the answer carries fields that tell the pipeline to broaden, re-parse, ask, or ship. The line becomes a loop.

![Image 5](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-27-1024x475.png)

_Each feedback field routes to a next action: ship, broaden, re-parse, ask, or enrich – Image by author_

### 2.1 Feedback paths[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#feedback-paths)

Each self-assessment field on `AnswerBase` triggers a specific pipeline path. **Same-run** paths react immediately to fix this question’s answer; **long-term** paths accumulate knowledge for future questions on the same concept.

**Same-run signals** (act on THIS question before returning):

*   `complete_answer_found = False` → **expand retrieval scope and retry**. The canonical same-run trigger. The answer we got is partial (1 of 5 expected exclusions; one half of a comparison missing). Broaden the keyword set (using `llm_discovered_keywords` if available, deduped against the original keywords: see code below) and call the generator again. Cost: one extra round-trip. Benefit: full coverage on multi-section questions.
*   `context_structured = False` → **re-parse** the source pages with a different method (Camelot, Docling, vision-language model), then re-retrieve. The model has detected an upstream parsing failure that the parser didn’t notice.
*   `conflicting_evidence = True` → **don’t return the answer**; show the conflict to the user _“two passages disagree on this date”_.
*   `suggested_clarification` set → **don’t answer**; ask the user one targeted question back. Cheaper than answering wrong.

**Long-term signal** (accumulate, don’t react now):

*   `llm_discovered_keywords` → **enrich the concept’s keyword table** (the expert dictionary built at question parsing time, Source B). The model spotted terms like _“declaration page”_ or _“schedule of benefits”_ that the original brief didn’t carry. For THIS run, re-retrieving with the same model rarely helps. For the **next** question on the same concept, those terms should already be in the dictionary so retrieval finds the right passages from the start. The pipeline persists discovered keywords to a concept-keyed table; the next `parse_question` call reads them back into the brief. Dedup against the existing entry is mandatory (the model often re-suggests known terms). The table grows with the project, not the question count.

Same-run retry and long-term enrichment can interact: if `complete_answer_found=False`**and** discovered_keywords are present **and** at least one of them is new, the retry can use the deduped union of original + discovered keywords for broader retrieval in this run. But the _trigger_ for retry is the completeness signal, not the keyword discovery: discovered keywords on a complete answer go to the long-term table and nowhere else.

The model isn’t just producing an answer; it’s **diagnosing the pipeline and proposing fixes**. The cost is one extra round-trip. The benefit is a system that recovers from upstream limits: retrieval that missed on a vocabulary mismatch, a parser that missed on a table, a context too narrow. People loosely call this _“agentic”_; it’s just feedback control.

**The feedback loop that closes back to the parsing brick is the one most pipelines skip.** Generation becomes a quality detector for parsing. The result: silent quality loss when documents have edge cases.

```
CONCEPT_KEYWORD_TABLE: dict[str, set[str]] = {}

def persist_discovered_keywords(parsed_q, result, concept_key=None) -> set[str]:
    key = concept_key or (parsed_q.keywords[0].text if parsed_q.keywords else "_default")
    known = CONCEPT_KEYWORD_TABLE.setdefault(key, set())
    discovered = {t.lower() for t in result.answer.llm_discovered_keywords}
    new_terms = discovered - known
    known.update(new_terms)
    return new_terms

def maybe_retry_when_incomplete(result, parsed_q, page_df, line_df, generate_fn):
    if result.answer.complete_answer_found and result.answer.confidence > 0.8:
        return None
    existing = {k.text.lower() for k in parsed_q.keywords}
    new_terms = [t for t in result.answer.llm_discovered_keywords
                 if t.lower() not in existing]
    if not new_terms:
        return None
    enriched = [k.text for k in parsed_q.keywords] + new_terms
    new_parsed = parsed_q.model_copy(update={"keywords": [Keyword(text=t) for t in enriched]})
    _, new_candidates = retrieve_pages(page_df, line_df, enriched, top_k=3)
    return generate_fn(new_parsed, new_candidates, client)
```

### 2.2 Unifying providers[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#unifying-providers)

A real RAG system rarely talks to one model. You might use OpenAI in production, Anthropic for evaluation, Mistral or a self-hosted model for internal sensitive data, and Ollama locally for development. Each has its own SDK, its own quirks, its own failure modes. Spreading provider-specific calls across the codebase is how you get into trouble.

The pattern is to wrap all providers behind a single function :

```
from typing import TypeVar
from pydantic import BaseModel
T = TypeVar("T", bound=BaseModel)
def get_completion(
    system: str, user: str, schema: type[T],
    provider: str = "openai", model: str | None = None, temperature: float = 0.0,
) -> T:
    """Single entry point for any LLM call. Returns a parsed Pydantic instance."""
    if provider == "openai":    return _openai_call(system, user, schema, model, temperature)
    if provider == "anthropic": return _anthropic_call(system, user, schema, model, temperature)
    if provider == "ollama":    return _ollama_call(system, user, schema, model, temperature)
    if provider == "mistral":   return _mistral_call(system, user, schema, model, temperature)
    raise ValueError(f"Unknown provider: {provider}")
```

Every other module in the codebase calls `get_completion`. Nobody imports `openai` directly. This pays in three ways:

*   **Provider swap is one variable:** Changing from OpenAI to Mistral is changing `provider="openai"` to `provider="mistral"`. Nothing else moves. A/B testing between providers is trivial.
*   **Local development matches production.** Development uses Ollama locally with Phi-4 or Mistral-Nemo; production uses Azure OpenAI. Same code path, different config. The bugs you find locally are the bugs you’d have found in prod.
*   **Fallback logic lives in one place:** When OpenAI rate-limits you, the wrapper transparently retries with Anthropic. When a self-hosted model is down, fall back to a hosted one. The application code doesn’t know.

The wrapper also normalizes quirks. Some providers handle structured output natively (OpenAI’s `responses.parse`), some need JSON schema in the prompt (most), some need grammar files (llama.cpp). The wrapper hides these differences behind a uniform `schema: type[T]` parameter. Inside the wrapper, the right machinery is invoked for the right provider. In this notebook, `generate()` talks to OpenAI directly to keep the dispatcher demo focused; in production, swap `client.responses.parse` for `get_completion(...)`.

### 2.3 Anti-patterns[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#anti-patterns)

A short list of generation anti-patterns I see repeatedly. None of them is fatal in isolation. Together they ruin reliability:

*   **The schema is too loose:** A bare `answer: str` with no convention for the NA value. The model invents its own (_“not available”_, _“n/a”_, _“unknown”_) and downstream code can’t reliably detect them. Pin the NA representation: empty `items` list, `answer_found=False`.
*   **Validation is skipped in production:** Validation is treated as a development-only concern. In production, raw model output flows directly to the user. The day a model paraphrases a quote, you find out from the user, not from your logs.
*   **Confidence scores taken at face value.** The model says 0.95, the application shows it as _“high confidence”_. But the model is poorly calibrated. Treat confidence as a triage signal, not a guarantee.
*   **The system prompt is treated as boilerplate.**_“Answer based on the context”_ is what most teams write, and it’s barely a prompt. The system prompt is where you encode every constraint: NA behavior, citation requirement, paraphrase prohibition, format requirements. It deserves the same care as the schema.
*   **Temperature greater than 0:** Reproducibility lost. The same question on the same documents gives different answers each call.
*   **No token budgeting:** Prompts grow as the candidate set grows, and approximations like _“about 4 characters per token”_ mask it. One day, a request hits the limit and silently truncates. Quality drops without anyone noticing.
*   **No feedback fields:** The pipeline never knows when retrieval drifted, when parsing was bad, when the context was incomplete. Open loop. Quality plateaus and stays there.
*   **Open-source models tested with thinking modes enabled.** A reasoning model is great for math problems and bad for JSON. If your output is structured, disable reasoning or use a non-thinking model.

### 2.4 In practice: the 12% paraphrase story[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#in-practice-the-12-paraphrase-story)

A team runs RAG over insurance contracts with a basic schema: `answer`, `line_start`, `line_end`. It passes the test questions. In production, the answers are _“almost right but not quite”_: paraphrasing drift, missing conditions, the occasional confident-but-wrong value. The team switches models, fine-tunes, swaps embedding providers. None of it helps.

The fix turns out to be in the schema. They add `quotes` (verbatim snippets), `caveats` (limitations), and `complete_answer_found` (whether the passages held the whole answer). The first time they validate quotes against source lines, they find that **12% of _“high-confidence”_ answers contain quotes that don’t appear in the cited passages**. The model was paraphrasing while pretending to quote. The issue lives in the architecture, not in the model: the schema didn’t ask for verbatim, so the model returned a paraphrase.

They add one rule: every quote must be a substring of the cited lines, or the answer is rejected. The paraphrase rate drops from 12% to 0.3%. Nothing about the model changed. It just knew it would be checked.

A few weeks later, a different problem shows up. About 8% of answers come back with `complete_answer_found=False`, but the system was returning them anyway. They add a feedback loop: on `complete_answer_found=False`, the system re-retrieves with broader scope and tries again. Recall on multi-section answers (exclusions, conditions, lists) jumps noticeably.

The interesting observation, six months in: **most of the gains came from the schema, not from the model**. They never fine-tuned. They never switched providers. They added structure, validated it, and looped feedback into the pipeline. The model had been capable all along; it just hadn’t been asked properly.

## 3. Conclusion[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#conclusion)

In this brick, generation is controlled execution: a typed function that consumes a `ParsedQuestion` and produces a structured object whose every field has a job. The user sees the answer, the citations, the caveats; the pipeline sees the feedback fields (discovered keywords, context completeness, parsing quality, conflicting evidence) and decides whether to retry, expand, re-parse, or return _“not found”_. Four choices keep it auditable: the schema is the contract, the prompt is composed from fragments instead of picked as a whole template, the answer is validated before anyone reads it, and the model provider is a switchable resource.

This closes Part II. The next article opens Part III with the four upgraded bricks wired together into one pipeline.

## 4. Sources and further reading[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_C_validation.html#sources-and-further-reading)

Constrained decoding guarantees the _shape_ of the output, never its _truth_: the launch post’s “100% schema adherence” is exactly where this article starts, not where it ends. The published ideas closest to the feedback half are Self-RAG’s reflection tokens; the contrast with chain-of-thought shows what changes when the model emits evidence instead of reasoning prose.

**Same direction as the article:**

*   OpenAI, _[Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)_. “100% schema adherence” guarantees the shape, not the content; this article is the checking that starts where the guarantee stops.
*   Asai et al., _Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection_, ICLR 2024 ([arXiv:2310.11511](https://arxiv.org/abs/2310.11511)). Reflection tokens, the published idea behind reacting to the model’s own signals: the feedback loops of section 2 are the engineered version.

**Different angle, different context:**

*   Wei et al., _Chain-of-Thought Prompting Elicits Reasoning in Large Language Models_, NeurIPS 2022 ([arXiv:2201.11903](https://arxiv.org/abs/2201.11903)). CoT generates reasoning the user has to trust; the structured-output approach generates evidence the user can audit. Different context, different output shape.

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
