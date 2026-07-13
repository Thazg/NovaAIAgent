Title: Stop Returning Text from RAG: The Typed Answer Contract That Prevents Hallucination

URL Source: https://towardsdatascience.com/stop-returning-text-from-rag-the-typed-answer-contract-that-prevents-hallucination/

Published Time: 2026-07-04T13:00:00+00:00

Markdown Content:
brick of [Enterprise Document Intelligence](https://towardsdatascience.com/document-intelligence-a-series-on-building-rag-brick-by-brick-from-minimal-to-corpus-scale/), a series that builds an enterprise RAG system from four bricks: document parsing, question parsing, retrieval, and generation. Generation is the fourth and last brick. This is the first of its three parts: the **contract**, the typed answer schema the model has to fill. The companions cover how the call that fills it is assembled (Article 8B, prompt assembly) and how the answer is checked and looped back into the pipeline (Article 8C, validation).

![Image 1](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-13-1024x572.png)

_where this article sits in the series: Article 8 (generation), the contract part, inside Part II (the four bricks) – Image by author_

![Image 2: 📓](https://s.w.org/images/core/emoji/17.0.2/svg/1f4d3.svg)**Runnable companion notebooks are on GitHub**: [doc-intel/notebooks-vol1](https://github.com/doc-intel/notebooks-vol1).

![Image 3](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-14-1024x658.png)

_The public companion-code repo at doc-intel/notebooks-vol1 – Image by author_

## 1. The model hallucinates; answer from the passages, not from memory[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#the-model-hallucinates-answer-from-the-passages-not-from-memory)

The first three bricks converge here, each covered in its own articles:

*   **Document parsing**, the PDF turned into structured tables: [Article 5A (what to read in a PDF)](https://towardsdatascience.com/beyond-extract_text-the-two-layers-of-a-pdf-that-drive-rag-quality/) and [Article 5B (the relational data model)](https://towardsdatascience.com/stop-returning-flat-text-from-a-pdf-the-relational-shape-rag-needs/).
*   **Question parsing**, the user string turned into a typed `ParsedQuestion`: [Article 6A (the thesis)](https://towardsdatascience.com/question-parsing-in-rag-structure-before-you-search/), [Article 6B (extraction)](https://towardsdatascience.com/what-the-question-parser-extracts-from-a-user-string-keywords-scope-shape-decomposition-clarification/), and [Article 6C (dispatch)](https://towardsdatascience.com/dispatching-the-parsed-rag-question-chunk-strategy-model-tier-activations-audit/).
*   **Retrieval**, the passages filtered down to what should hold the answer: [Article 7A (retrieval as filtering)](https://towardsdatascience.com/retrieval-is-filtering-not-search-a-mental-model-for-enterprise-rag/), [Article 7B (anchor detection)](https://towardsdatascience.com/anchor-detection-for-rag-parallel-detectors-then-one-llm-call-at-the-end/), and [Article 7C (the LLM arbiter)](https://towardsdatascience.com/letting-an-llm-pick-the-right-rag-page-the-arbiter-pattern-at-the-end-of-retrieval/).

The generator’s job is to turn those passages and that question into an answer, and the model will hallucinate on the way. That is not a bug to patch. It is what generative AI does: it predicts the most plausible next token, it does not look anything up. On a topic that saturates its training data the prediction is reliable. On your contract, seen once or never, it predicts a continuation just as fluent, just as confident, and far more likely to be wrong. You can’t train that away. You can only shrink the room for it.

Most of that room is already closed by the time generation runs. Each brick before it hands generation something clean:

*   **Document parsing** gives it structured tables, not a garbled text dump.
*   **Question parsing** gives it a precise question and a declared answer format, the shape and type to return, not a loose string.
*   **Retrieval** gives it the minimum, the few passages that actually hold the answer, each pinned to a clear anchor on its exact lines.

Three bricks, three ways the room to invent got smaller. The ground is prepared, and generation only has to not waste it.

![Image 4](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-15-1024x499.png)

_The model predicts either way and you can’t control what it saw in training, so ground the answer in the retrieved passage – Image by author_

Generation is where you spend that preparation, and the lever is not a smarter prompt (_“do not make things up”_ changes nothing). It is **controlled execution**. The model answers only from the passages in front of it, in a typed shape, with a citation for every claim. Structured input, passages plus question, in. Structured output, a typed schema with citations, fidelity flags, and feedback for the pipeline, out. Ask for _“an answer”_ and the model fills the gaps from memory. Ask for a structured object whose every field is checked against the input, and it has nowhere to invent.

## 2. Asking the model for more than “the answer”[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#asking-the-model-for-more-than-the-answer)

The schema is the **contract** between the pipeline and the model, and it doesn’t have to stop at _“the answer”_. The [minimal RAG pipeline](https://towardsdatascience.com/baseline-enterprise-rag-from-pdf-to-highlighted-answer-enterprise-document-intelligence-vol-1-1/)’s `AnswerWithEvidence` was the minimum that earns the word _“RAG”_: a direct answer, the evidence start/end, a confidence, optional quotes and caveats. That works for prose questions. Every field we add past that is another question the schema asks the model, and each earns its place by giving the pipeline something it couldn’t get otherwise.

The rich contract stacks four kinds of fields on top of the minimal one:

*   **Typed values** per shape (section 2.1): `Amount(value, currency, unit)` instead of the string `"USD 1,200 per claim"`; `DateValue(iso, original)` instead of `"15 March 2024"`; `TableValue(headers, rows)` instead of pipe-separated text. Downstream code never re-parses a string.
*   **Multi-element answers with multi-span citations** (section 2.2): many real questions have a list as the answer; many single-element answers have non-contiguous evidence (a definition on page 5 plus an example on page 23). The schema models both directly.
*   **Self-assessment + pipeline-feedback fields** (section 2.3): `confidence`, `caveats`, `answer_found`, `complete_answer_found`, `context_structured`, `llm_discovered_keywords`, `conflicting_evidence`, `suggested_clarification`. Each of these makes the model emit a signal the pipeline reads to decide its next move.
*   **Programmatic completeness** (section 2.4): the one signal we deliberately do **not** ask the model. It’s set by the pipeline based on what _retrieval_ was parametrized to include (an overlap page beyond the section, for instance). Strong because deterministic, grounded in document structure, not in the model’s self-rating.

These four are the ones we develop here. **The list isn’t closed.** Once the schema is the contract, adding a new indicator costs one field declaration and one prompt fragment: _“flag redacted blocks”_, _“return per-item table\_confidence”_, _“emit jurisdiction when the clause cites a law”_, anything the pipeline needs. The right indicators depend on the corpus and the downstream consumer; this article shows the four general-purpose ones, and the registry pattern (section 2.3) keeps the door open for custom shapes.

**The schema is built bottom-up in four layers**, one per subsection: **Value** (section 2.1, the typed primitive: `Amount`, `DateValue`, `TableValue`, plus a `Span` that holds one contiguous citation range) → **Item** (section 2.2, one Value + its evidence Spans, e.g.`AmountItem(amount, spans)`) → **Answer** (section 2.3, a `list[Item]` + the self-assessment and pipeline-feedback fields shared via `AnswerBase`; a registry maps shape labels to Answer subclasses) → **Programmatic completeness** (section 2.4, the one signal computed by the pipeline rather than asked of the model). How this contract is enforced at decoding time (Pydantic v2 schemas + OpenAI’s Responses API `client.responses.parse(...)`, plus the fallback hierarchy for providers without constrained decoding) is section 2.5.

**A note on vocabulary**, used consistently from here on. **Value** = a typed primitive (`Amount`, `DateValue`, `Address`, …), one Pydantic class per concept. **Shape** = the string label (`"amount"`, `"date"`, …) that the question parsing brick emits and that the registry uses as a key. **Item** = one value + its evidence spans (`AmountItem(amount, spans)`). **Schema** (or **Answer**) = the top-level Pydantic class passed to `responses.parse` (`AmountAnswer`, `TextAnswer`, …); inherits `AnswerBase` for the shared feedback fields. **Contract** = informal name for what the schema enforces: shape, types, required fields, so the pipeline can read `result.answer.items` without `try/except`.

### 2.1 Typed values, one schema per `answer_type`[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#typed-values-one-schema-per-answer_type)

The first layer of the schema is the **value**: the typed primitive the model fills in. The question parsing brick tags every question on two orthogonal axes:

*   `answer_shape` (the cardinality): `single` / `listing` / `table` / `tree` / `nested_json`
*   `answer_type` (the value type): `amount`, `date`, `iban`, `text`, `boolean`, …

The registry that maps each `answer_type` to a concrete value class is built in section 2.3 once `AnswerBase` is in scope; the shape axis decides how those values get wrapped (one value vs a list vs a 2D table). Here we just define the value classes and the citation atom (`Span`).

**All line numbers are global** (across the whole document, not per-page); the convention is enforced in the BASE prompt of Article 8B (prompt assembly).

Each value type, briefly:

*   `Amount(value, currency, unit)`: ISO 4217 code, optional unit like `"per claim"`. The schema enforces that the currency exists and is a string; downstream sums and conversions work.
*   `DateValue(iso, original)`: ISO 8601 plus the original phrasing as written in the document. Two fields because the consumer wants the parseable form, and the user wants to recognise what’s in the source.
*   `TableValue(headers, rows)`: a true 2D structure, not pipe-separated text. Useful for premium grids, comparison tables, and any _“list me X for each Y”_ question.
*   `bool` for boolean answers (covered? excluded? compliant?), with `caveats` carrying any required nuance.
*   `text: str` for everything else: definitions, paraphrases, narrative answers.

Each value will be wrapped in an Item in section 2.2: `AmountItem(amount: Amount, spans: list[Span])` and so on, one Item class per shape. This is more verbose than a single `answer: str`, but the verbosity is what makes the output programmatically useful.

A companion field, `extraction_method`, lives one layer up on `AnswerBase` (section 2.3) and says **how** the answer was obtained. It is the field-level version of the section 1 point: `verbatim` and `computed` are grounded in the passages in front of the model, while `inferred` is the model filling a gap from its own memory, the recall we don’t trust on your documents. The four values:

*   `"verbatim"`: the value is written word-for-word in the passages. The validator (Article 8C, validation) reads this and requires at least one quote that is a substring of the cited spans.
*   `"computed"`: the value required combining several elements from the passages (summing line items, for example). Should be checked.
*   `"inferred"`: the value is derived but not explicit. Should be reviewed by a human.
*   `"na"`: no answer.

```
class Span(BaseModel):
    line_start: int
    line_end: int
    quote: str | None = None

class Amount(BaseModel):
    value: float
    currency: str
    unit: str | None = None

class DateValue(BaseModel):
    iso: str
    original: str

class TableValue(BaseModel):
    headers: list[str]
    rows: list[list[str]]
```

**Worked example: the address question.** A user asks _“what’s the address?”_ and the database that consumes the answer wants four columns: `street`, `postal_code`, `city`, `country`. The instinct is to ask four questions: _“what’s the address?”_, _“what’s the postal code?”_, _“what’s the city?”_, _“what’s the country?”_. Each call retrieves the same passage (in the source, the address sits as one block: _“350 Fifth Avenue, New York, 10118, USA”_), and asks the model to slice off one piece. **Four round-trips for one extraction. Four chances for the model to drift. Four times the data crossing the API boundary. Four times the cost.**

The developer’s move is to declare the typed value once. `Address(BaseModel)` with fields `street`, `postal_code`, `city`, `country`, registered next to `Amount`, `DateValue`, `TableValue` in `ANSWER_REGISTRY`. From then on, a single question returns a populated `Address` object that maps directly to `INSERT INTO addresses(street, postal_code, city, country) VALUES (...)`. One call, one retrieval (the source had the address in one block anyway), one row, one place to audit.

**The schema is both contract and instruction**. The API enforces the four fields exist, and the model, seeing the four named fields in the response shape, knows to break the block apart by itself.

This is the _amplify the expert_ pattern at the field level. End users keep asking their natural _“what’s the address?”_; the developer codifies the structuring once and the next thousand answers flow into the SQL pipeline without re-asking. The same logic applies to every recurring extraction the corpus contains: a person’s name into `first_name` / `last_name` / `middle_initial`, a price into `value` / `currency` / `unit`, a date range into `iso_start` / `iso_end`. Each one is a small Pydantic class the developer adds once.

**Worked example: comparing amounts. Never ask the model the comparison.** A user asks _“is the contract premium above one million dollars?”_. The naive path is to ask exactly that: _“yes or no, is the premium > 1,000,000 USD?”_, and trust the answer. **Don’t.** The model has to do three things in one shot: locate the premium, parse its currency, and compare. Each step is a chance to drift, and the binary output erases the value that produced it: no audit trail. Worse, currency conversion happens silently, with no visible exchange rate: a `100,000,000 JPY` premium becomes _“yes”_ or _“no”_ depending on whatever the model believes the JPY/USD rate is today.

The right move: **extract first, then compare in Python**. Ask for an `Amount(value, currency, unit)`. Apply the conversion explicitly (`amount.value * RATE[amount.currency]["USD"]`). Compare with the threshold. Every step is visible, auditable, replayable, and if the conversion rate updates, the answer can be recomputed without re-calling the model. **The rule generalizes**: never delegate computation, comparison, or aggregation to the LLM when the result can be derived deterministically from extracted values. The LLM extracts; Python compares.

![Image 5](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-9-1024x534.png)

_Extract first, compare in Python: a JPY premium silently swallowed by the LLM – Image by author_

What the typed extraction looks like on four real shapes: `Address`, `Amount`, `DateValue`, `PersonName`: with realistic noise around the target on the raw side, and the clean Pydantic object on the right:

![Image 6](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-10-1024x906.png)

_Raw passage to structured object across four typed shapes – Image by author_

### 2.2 Multi-element answers and multi-span citations[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#multi-element-answers-and-multi-span-citations)

The minimal schema assumes one answer with one contiguous span of supporting lines. Real questions break that assumption two ways.

**Many questions have a list as their answer**, not a single value. _“What are the categories under the Identify function?”_ expects six items, each with its own evidence. _“Which exclusions apply to flood damage?”_ expects however many exclusions are written, each pointing to its own clause. The schema models this with `items: list[XItem]`. Zero items means _not found_, one item means a single answer, N items means a list. **Each item carries its own value AND its own evidence.** Never a single span covering the whole list.

**Even single-element answers often have non-contiguous supporting evidence.** A definition on page 5 plus an example on page 23. A condition plus its exception in a separate paragraph. A value plus its footnote. Forcing a single contiguous range either over-cites (one big span swallowing irrelevant lines in between) or under-cites (picking one of the spans and dropping the others). The schema models this with `spans: list[Span]` per item. A single-span answer is just a list of length one. A multi-span answer has each region cited separately.

`Span` is the small atom: a contiguous `line_start..line_end` range, plus an optional `quote`. **Two steps, kept separate.** What the model returns is pure structured data: line numbers, typed values, flags. It never returns the evidence text. Afterward, the pipeline recovers the rest from the source tables: the actual snippet by joining `line_df` on `line_start..line_end`, and the bounding box for the PDF (Article 8C, validation). The `quote` is the one field where the model may echo text, and it earns its place only as a check: the validator confirms it is a substring of the cited lines, which catches a wrong line number. The snippet the user reads is always the recovered one, never the model’s.

```
class TextItem(BaseModel):
    text:  str
    spans: list[Span] = Field(default_factory=list)

class AmountItem(BaseModel):
    amount: Amount
    spans:  list[Span] = Field(default_factory=list)

class DateItem(BaseModel):
    date:  DateValue
    spans: list[Span] = Field(default_factory=list)

class BooleanItem(BaseModel):
    boolean: bool
    spans:   list[Span] = Field(default_factory=list)

class TableItem(BaseModel):
    table: TableValue
    spans: list[Span] = Field(default_factory=list)
```

The same Item shape covers two patterns side by side: a multi-element list (one item per element, each with its own span) and a single item whose evidence spans non-contiguous regions of the source:

![Image 7](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-11-1024x871.png)

_Multi-element list vs multi-span citation: same Item shape, different cardinalities – Image by author_

### 2.3 Self-assessment and pipeline-feedback fields[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#self-assessment-and-pipeline-feedback-fields)

The feedback fields are where the schema starts steering the pipeline. Every shape-specific answer inherits the same `AnswerBase` fields, in two groups: what the model thinks of its own output, and what the pipeline reads to decide its next move.

**Self-assessment**: what the model thinks of its own output:

*   `confidence: float ∈ [0, 1]`: the model’s self-rated certainty. Not a calibrated probability; treat it as a triage signal. A 0.5 or 0.6 deserves a second look; a 0.9 on a complex table question does not mean the answer is correct.
*   `caveats: list[str]`: natural-language limitations: _“The clause uses ‘reasonable’ without defining it.”_ _“Two passages give conflicting dates.”_ For legal or compliance use, caveats are often more valuable than the answer itself.
*   `extraction_method` (already covered in section 2.1): verbatim / computed / inferred / na.

**Pipeline-feedback**: what the pipeline reads to decide its next move:

*   `answer_found: bool` and `complete_answer_found: bool`: **two binary signals, on purpose**. `answer_found=False` means we extracted nothing usable (shape mismatch on amount/date, or off-corpus). `answer_found=True, complete_answer_found=False` means we got something but it’s partial. The model sets this when it spots **in-passage clues** of incompleteness: a numeric expectation contradicted by what’s there (_“five exclusions”_ but only three on the page), a forward reference (_“see Section 7 for additional…”_), a sentence that dangles into a comma at the bottom of the page. The case the model can **not** detect (a clean ending that’s in fact mid-list) is what section 2.4’s strong signal is for. The full answer requires both flags True. Splitting the signal lets the pipeline take different actions: NA path on the first, broader retrieval on the second.
*   `context_completeness_weak: float ∈ [0, 1]`: the model’s view, **from inside the retrieved scope**, of whether the passages provided enough context. The model judges from dangling punctuation, mid-sentence cutoffs, forward references the passage itself shows. _Weak_ because it can only see what was retrieved; if the truncation is invisible from inside (the page ends with a clean period mid-list), this signal misses it. section 2.4 pairs it with a _strong_ programmatic signal that looks **beyond** the retrieved scope.
*   `context_structured: bool`: flags whether the passage _looked_ well-parsed. If the model received what looks like a garbled table (column values jumbled together, headers and rows mixed), it sets this to False. The pipeline can then route that page through a different parser (Camelot, Docling, vision-language model) and retry. **The model becomes a detector of upstream parsing failures.**
*   `llm_discovered_keywords: list[str]`: the model’s contribution to the next iteration. While reading the passages, the model often notices terms that would have made the original retrieval better. _“I see this passage uses the term ‘declaration page’. Was that in the original query?”_ Those keywords get logged and can be added to the next retrieval round.
*   `keywords_found: list[str]`: which of the original query terms appeared in the passages. If the user asked about _“premium”_ and the passage doesn’t contain that word, the connection between question and answer is purely semantic. Information worth surfacing.
*   `conflicting_evidence: bool`: flags passages that contradict each other. Common in contracts with amendments, in versioned documents, in regulatory filings with revisions. The model says _“I see two dates and they don’t agree”_ rather than picking one arbitrarily.
*   `suggested_clarification: str | None`: what the model offers when the question is too ambiguous to answer confidently. Connects directly to the question parsing brick: when the system should ask rather than guess, the model proposes the clarification.

**Architectural split**: `RichAnswer` (or rather, the family `TextAnswer`, `AmountAnswer`, …) is what the LLM produces. The pipeline keeps its trace separately on a sibling `GenerationResult` so it never travels through `responses.parse`. Two reasons. **Architectural**: the trace is filled by the dispatcher (Article 8B, prompt assembly), never by the model; keeping it out of the LLM-facing schema makes that boundary explicit. **Mechanical**: OpenAI’s structured-output mode requires every object schema to declare `additionalProperties: false`. A free-form `dict[str, Any]` field on the LLM-facing schema makes the request fail. Keeping the trace on `GenerationResult` sidesteps the constraint by construction.

```
class AnswerBase(BaseModel):
    extraction_method: Literal['verbatim','computed','inferred','na']
    confidence: float
    caveats: list[str] = []
    answer_found: bool
    complete_answer_found: bool
    context_completeness_weak: float
    context_structured: bool
    llm_discovered_keywords: list[str] = []
    keywords_found: list[str] = []
    conflicting_evidence: bool
    suggested_clarification: str | None = None

class TextAnswer(AnswerBase):    items: list[TextItem]
class AmountAnswer(AnswerBase):  items: list[AmountItem]
class DateAnswer(AnswerBase):    items: list[DateItem]
class BooleanAnswer(AnswerBase): items: list[BooleanItem]
class TableAnswer(AnswerBase):   items: list[TableItem]
ListAnswer = TextAnswer

ANSWER_REGISTRY = {
    "text": TextAnswer,    "amount": AmountAnswer,
    "date": DateAnswer,    "boolean": BooleanAnswer,
    "table": TableAnswer,  "list": ListAnswer,
}
```

The answer payload is only half of what generation returns. The pipeline also needs a trace of what was used to produce it (model name, prompt version, retrieved context), so the answer ships wrapped in a `GenerationResult`:

```
@dataclass
class GenerationResult:
    answer: AnswerBase
    meta:   dict[str, Any] = field(default_factory=dict)
```

The four examples below show the **same**`AnswerBase` populated for four different cases, each a (Question, retrieved Context, generated JSON) triple. Retrieval is **assumed correct** in all four: the variation comes from what the document contains and how the model reports it. The combination of `answer_found`, `complete_answer_found`, `conflicting_evidence`, and `caveats` is what tells the dispatcher (Article 8C, validation) which route to take next: ship the answer, retry retrieval, fall through to the no-answer path, or return a clarification.

**1. Complete answer.** The user asks for the five Functions of the [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework) (US Government work, public domain in the US, see [NIST copyright statement](https://www.nist.gov/director/copyright-fair-use-and-licensing-statements-srd-data-software-and-technical-series)), retrieval lands on the passage that lists all five, and the model returns one item per Function with its evidence span. `answer_found=True`, `complete_answer_found=True`, `caveats=[]`, high `confidence`. The dispatcher reads these signals and ships the answer as-is.

```
{
  "items": [
    {"text": "Identify", "spans": [{"line_start": 88, "line_end": 88, "quote": null}]},
    {"text": "Protect",  "spans": [{"line_start": 89, "line_end": 89, "quote": null}]},
    {"text": "Detect",   "spans": [{"line_start": 90, "line_end": 90, "quote": null}]},
    {"text": "Respond",  "spans": [{"line_start": 91, "line_end": 91, "quote": null}]},
    {"text": "Recover",  "spans": [{"line_start": 92, "line_end": 92, "quote": null}]}
  ],
  "extraction_method": "verbatim",
  "confidence": 0.95,
  "caveats": [],
  "answer_found": true,
  "complete_answer_found": true,
  "context_completeness_weak": 0.9,
  "context_structured": true,
  "llm_discovered_keywords": [],
  "keywords_found": ["function", "framework"],
  "conflicting_evidence": false,
  "suggested_clarification": null
}
```

**2. Partial answer.** The user asks for natural-disaster exclusions, the retrieved passage lists earthquake (one match) and explicitly flags _“continued in Section 7”_ on line 236, but Section 7 wasn’t retrieved. The model returns the one item it can extract, sets `complete_answer_found=False`, and reports `"Section 7"` in `llm_discovered_keywords`. The dispatcher reads `complete_answer_found=False` and triggers a broader retrieval round using the discovered keywords before returning the final answer to the user. This scenario is the _in-passage_ detection case: the truncation is visible from inside the retrieved scope thanks to the _“continued in”_ hint. The harder case, where the passage ends cleanly with no such hint, is what section 2.4’s next-page peek catches.

```
{
  "items": [
    {"text": "Damage from earthquake or seismic events",
     "spans": [{"line_start": 234, "line_end": 234,
                "quote": "(c) damage from earthquake or seismic events;"}]}
  ],
  "extraction_method": "verbatim",
  "confidence": 0.7,
  "caveats": [
    "Only 1 exclusion found in retrieved passage ; line 236 points to Section 7 (not retrieved)."
  ],
  "answer_found": true,
  "complete_answer_found": false,
  "context_completeness_weak": 0.5,
  "context_structured": true,
  "llm_discovered_keywords": ["Section 7", "additional exclusions"],
  "keywords_found": ["exclusion"],
  "conflicting_evidence": false,
  "suggested_clarification": null
}
```

**3. No answer.** The user asks about the cancellation period, but retrieval pulled the premium-schedule passage, which doesn’t mention cancellation. The model honestly returns `items=[]`, `answer_found=False`, `extraction_method="na"`, and a caveat naming what the passage **did** cover versus what’s missing. The dispatcher takes the no-answer path: either tell the user _“not found in this document”_, or rephrase the query and retry once before giving up.

```
{
  "items": [],
  "extraction_method": "na",
  "confidence": 0.0,
  "caveats": [
    "Retrieved passage covers premium, deductible and fees, not the cancellation period."
  ],
  "answer_found": false,
  "complete_answer_found": false,
  "context_completeness_weak": 0.2,
  "context_structured": true,
  "llm_discovered_keywords": [],
  "keywords_found": [],
  "conflicting_evidence": false,
  "suggested_clarification": null
}
```

**4. Conflicting evidence.** The user asks for the effective date, retrieval brings back both the original date (line 56) and a later amendment (line 178), with different values. The model returns **both** items rather than picking one, sets `conflicting_evidence=True`, names the conflict in `caveats`, and proposes a `suggested_clarification`. The dispatcher reads `conflicting_evidence=True` and shows the conflict to the user instead of guessing.

```
{
  "items": [
    {"text": "2024-03-15",
     "spans": [{"line_start": 56, "line_end": 56,
                "quote": "Effective: 15 March 2024 (original)"}]},
    {"text": "2024-04-01",
     "spans": [{"line_start": 178, "line_end": 178,
                "quote": "Effective date: 1 April 2024 (amended)"}]}
  ],
  "extraction_method": "verbatim",
  "confidence": 0.5,
  "caveats": [
    "Two effective dates found: 15 March 2024 (original) and 1 April 2024 (amendment)."
  ],
  "answer_found": true,
  "complete_answer_found": true,
  "context_completeness_weak": 0.85,
  "context_structured": true,
  "llm_discovered_keywords": ["amendment"],
  "keywords_found": ["effective", "date"],
  "conflicting_evidence": true,
  "suggested_clarification": "Original date (2024-03-15) or amended (2024-04-01)?"
}
```

### 2.4 The complement: programmatic completeness (the strong signal)[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#the-complement-programmatic-completeness-the-strong-signal)

One completeness signal is too important to trust the model with, so the pipeline computes it. There’s deliberately no `context_completeness_strong` field: it’s set by the pipeline, based on what **retrieval was told to include** in the context.

Imagine you ask the model for the list of exclusions in a policy. Retrieval anchors on the _“Exclusions”_ section via the TOC and hands the model page 5: items (a) through (e), the last one ending with a clean period. The model reads page 5, emits five items, sets `complete_answer_found=True` and `context_completeness_weak` high. _From inside the page_, the list reads as complete.

**But neither the model, nor a human reading page 5 alone, can tell whether items (f), (g), (h) sit on page 6.** A clean period at the bottom of a page proves a sentence is finished, not that a list is. The only way to know is to look at the next page. And the next page is one of two things:

*   **A new section heading** (something like _“Section 5: Coverage Limits”_). The previous list was bounded by the section change. Page 5 _was_ complete.
*   **A continuation of the previous section** (items (f), (g), (h) where you expected the heading). The list was truncated. Page 5 _looked_ complete only because the page break happened to land on a clean sentence.

The trap is that the LLM never sees page 6. It judges from whatever it receives, and a page-five-only context _always_ reads as complete when the cut is clean, even when the document continues. So `context_completeness_weak` cannot catch this class of failure, no matter how well the model introspects.

The fix is a **retrieval choice**, not a generation one. Retrieval is best treated as a parametric module with several knobs:

*   start page, end page
*   line-level selection (sometimes the answer is two specific lines and you want nothing more)
*   and (relevant here) an optional **one-page overlap beyond the section’s last known page**

Whether a query asks retrieval for _“just the matching section”_ or _“the section plus one overlap page”_ is set per question shape. The overlap page never goes to the LLM; it stays with the pipeline as evidence for the post-generation completeness check. With the overlap, the pipeline gets a deterministic verdict: a new heading at the top → bounded; continuation content → truncated.

The analogy is **chunk overlap**: chunk overlap ensures no fact is sliced in half between two chunks; the page-overlap retrieval parameter ensures no list is sliced in half between two retrieval scopes. Either way, safety is bought by deliberately pulling slightly more than seems strictly necessary.

**When is the tail worth the cost?** It turns on how good the TOC is.

**If the TOC is perfect to the line:** When parsing’s `toc_df` accurately marks every section’s start and end, retrieval can pull exactly the relevant section without a tail. You save tokens. The strong signal becomes optional insurance.

**If the TOC is imperfect** (the typical case: the document has no TOC, the parser missed a heading because of an unusual font, the section ran slightly longer than the TOC suggested), the one-page tail is the safety net. The cost is one extra page per query (~500-1000 tokens for a typical PDF). The benefit is deterministic detection of truncated answers: a class of failure neither the model nor an expert can catch from the retrieved context alone.

**What this needs from parsing and retrieval.** Both upstream modules contribute. **Parsing** exposes `section_end_page` in `toc_df` via a simple convention: TOCs almost never spell out where sections end, but the _next_ section’s `start_page` is the implicit end + 1. With that column, retrieval has a one-lookup answer to _“how far does this section go?”_. **Retrieval** then decides, per question shape, whether to pull `[start_page, section_end_page]` exactly or to add the one-page tail. Generation only consumes the resulting `context_completeness_strong` field: it doesn’t decide the retrieval shape, it reads the signal and reacts (ship the answer, or trigger a refetch).

The figure below shows the truncation case in action. The **amber panel** is what the LLM saw: page 5 only, with the five items ending on a clean period. From the model’s seat, the list reads as complete and the JSON it returns says so (`complete_answer_found=true`). The **blue panel** is what the pipeline pulled separately as evidence for the post-gen check: page 6’s first lines, which begin with item (f) instead of a new section heading. The model never saw the blue panel; the pipeline did, sets `context_completeness_strong=false`, and triggers a refetch with the broader scope.

![Image 8](https://contributor.insightmediagroup.io/wp-content/uploads/2026/07/image-12-618x1024.png)

_Pipeline’s page-6 peek catches a truncation the LLM missed; refetch triggered – Image by author_

The bounded case is the mirror image. Same question, same page-5 content, but the blue panel begins with _“Section 5. Coverage Limits”_ instead of item (f). The pipeline marks `context_completeness_strong=True` and ships the answer: _proven_ bounded this time, the model’s claim now backed by the pipeline check.

**A secondary check: per-span boundary cleanness.** This one is a helper, not the headline. For each `Span` in each answer item, the pipeline can ask: does the span **start** at the beginning of a paragraph or mid-sentence? Does it **end** at clean terminal punctuation? Are the lines contiguous, or is there a gap? These per-span checks catch a different failure mode (a single span that cut the supporting evidence in half), and they don’t require a peek. Useful as a per-item triage tool; not a replacement for the next-page peek when the question is _“is the answer set complete?”_.

### 2.5 How the contract is enforced[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#how-the-contract-is-enforced)

Constrained decoding is what makes the contract real: with `responses.parse`, the model **cannot** return an output that fails to parse. Below it sits a hierarchy of weaker fallbacks, ordered by reliability:

1.   **Pydantic + `responses.parse`** (or equivalent native structured output API). The API enforces the schema at decoding time: **the model cannot return an output that fails to parse**. Most reliable. This is what the rest of this article uses.
2.   **JSON Schema with structured output mode.** Same idea, JSON-native. Used when Pydantic isn’t available or when targeting a non-Python consumer.
3.   **JSON Schema in the prompt with _“return valid JSON”_.** No decoding-level enforcement. The model usually complies, but you have to validate after the fact. Use as a fallback when the provider doesn’t expose a structured-output API.
4.   **Just _“return JSON”_ as a vague instruction.** Avoid. The model will mostly comply, but it will occasionally wrap the JSON in ````json` blocks, prepend _“Here’s the answer:”_, or include trailing commas. Each of these breaks downstream consumers.

JSON and Pydantic are interchangeable in concept: Pydantic is just a Python-friendly way to declare a JSON schema with validation. Either is meaningfully stronger than asking _“return JSON”_ in a prompt and hoping.

> **In the wild: open source models and JSON.** Reliability of structured output varies a lot across models. OpenAI’s structured output mode and Anthropic’s tool use are highly reliable. Among open source models, Phi-4, Mistral-Nemo, and Llama-3.3 with grammar-constrained decoding (vLLM grammars or llama.cpp GBNF) work well. _“Thinking”_ models with explicit reasoning (DeepSeek-R1 style, certain Qwen modes) are **less** reliable for JSON: the reasoning trace pollutes the output and the model struggles to switch back to clean JSON at the end. For structured output workloads, prefer non-thinking models or explicit modes that disable reasoning. Quality of JSON output and raw model size are **not correlated**: a smaller model with grammar constraints often outperforms a larger one without.

## 3. Conclusion[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#conclusion)

The contract is declared: typed values so downstream code never re-parses a string, items that bind each value to its evidence spans, the self-assessment and pipeline-feedback fields, and the one completeness signal the pipeline computes itself. Declaring it is half the work. Article 8B (prompt assembly) builds the call that fills the contract: the schema picked from the registry, the system prompt composed from a fixed BASE plus fragments, the full trace kept for audit. Article 8C (validation) checks what comes back and decides the pipeline’s next move.

## 4. Sources and further reading[](file:///C:/Users/shike/Documents/Github/rag/book_1/en_tds/_rendered/08_A_contract.html#sources-and-further-reading)

The contract rests on constrained decoding: the article uses OpenAI’s [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs) (`responses.parse`, Aug 2024) and the mechanism described in Willard and Louf ([Outlines](https://arxiv.org/abs/2307.09702), 2023). The reflection-token idea from Asai et al.([Self-RAG](https://arxiv.org/abs/2310.11511), ICLR 2024) is the published idea behind the pipeline-feedback fields of section 2.3. The citation-bearing answer schema (`AnswerWithEvidence`) is in the same family as Bohnet et al.([Attributed Question Answering](https://arxiv.org/abs/2212.08037), 2022). The vocabulary the literature uses is _constrained decoding_ and _structured generation_; _controlled execution_ is this brick’s coinage: the LLM call sits inside an engineered switch, not in front of an agent loop.

**Same direction as the article:**

*   OpenAI, _[Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)_. The official doc + Aug 2024 launch post for “100% schema adherence”. The whole approach depends on this being reliable.
*   Willard & Louf, _Efficient Guided Generation for Large Language Models_ (Outlines), 2023 ([arXiv:2307.09702](https://arxiv.org/abs/2307.09702)). The constrained-decoding paper; the open-source equivalent of OpenAI’s structured outputs and the mechanism that makes “schema is the contract” true.
*   Asai et al., _Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection_, ICLR 2024 ([arXiv:2310.11511](https://arxiv.org/abs/2310.11511)). Reflection tokens are the published idea behind the pipeline-feedback fields built in section 2.3.
*   Bohnet et al., _Attributed Question Answering: Evaluation and Modeling for Attributed Large Language Models_, 2022 ([arXiv:2212.08037](https://arxiv.org/abs/2212.08037)). Citation-bearing answer schemas before the constrained-decoding wave; the published idea behind `AnswerWithEvidence`.

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
