# FAQ Chatbot — Implementation Options and Design Findings

Date: 2026-08-17
Module: FAQ Chatbot (Student-facing) + Academic FAQ Editor (Office Staff)
Status: Options analysis. No approach selected yet.

## 1. Purpose

Replace the current keyword-matching FAQ chatbot with a system that understands
what a student actually means, while guaranteeing every answer comes from the
official FSKTM FAQ document rather than from a model's general knowledge.

This document records what exists today, what the source FAQ contains, and every
implementation approach considered, with the trade-offs of each.

## 2. Current state

### 2.1 Frontend

- `frontend/src/components/StudentFAQChatbot.tsx` (373 lines) — student chat UI.
- `frontend/src/components/AcademicFAQEditor.tsx` (587 lines) — Office Staff editor UI.

Both are presentation-only. The chatbot "answers" through a hardcoded chain at
`StudentFAQChatbot.tsx:112-131`:

```ts
const lowerText = textToSend.toLowerCase();
if (lowerText.includes('deadline') || lowerText.includes('supervisor')) { ... }
else if (lowerText.includes('profile')) { ... }
else if (lowerText.includes('grant') || lowerText.includes('sponsorship')) { ... }
```

Failure mode: a student asking "how long do I have to finish my masters?" gets
nothing, because the FAQ files that answer under the word "duration". The match
is lexical, not semantic.

### 2.2 Backend

Nothing exists. There is no `faq` Django app, no `faqApi.ts` service, no FAQ
models, types, or mocks. The module is built from scratch.

This is the only one of the ten modules with no backend at all, so there is no
migration burden and no compatibility constraint.

## 3. Source document — `FAQ.pdf`

Uploaded 2026-08-02. Located at the project root (outside the git repository).

| Property | Value |
|---|---|
| Pages | 14 |
| Extracted text | ~33,247 characters (~10,000 tokens) |
| Q&A rows | 163 (93 categorised + 70 on a duplicate "ALL" sheet) |
| Expected growth | < 200 Q&As |

> Figures below were corrected on 2026-08-17 after running
> `scripts/parse_faq_pdf.py`. The initial estimates in this section came from a
> rough text scan and were wrong in two ways, both recorded here.

### 3.1 Categories

Six categorised sections, pages 1–8:

1. `STUDENT APPLCATION` *(typo in source — missing "I")* — 28 entries
2. `ADMISSION & OFFER LETTER` — 26
3. `COURSE REGISTRATION` — 16
4. `DURING SEMESTER` — 13
5. `RP- DISSERTATION - THESIS` *(missing space in source)* — 6
6. `COMPLETION & GRADUATION` — 4

**Correction:** an earlier draft listed `BAHASA MALAYSIA LANGUAGE REQUIREMENT`
as a seventh section. It is not one. That upper-case run is a hyperlink label
inside a page-5 *answer* ("APPLICATION FOR EXEMPTION FROM THE BAHASA MALAYSIA
LANGUAGE REQUIREMENT"). Genuine section tabs are printed in the page header
band (`top < 80`); the extractor now discriminates on position.

Structure is a numbered `NO. | QUESTION | ANSWER` table per section.

### 3.2 The duplicate "ALL" sheet

Pages 9–14 are a separate sheet headed `ALL` holding 70 rows that largely
repeat the categorised sections — 46 questions appear on both sheets, 24 are
unique to `ALL`. The page-1 answer defect is reproduced there too.

**This must be resolved before loading.** Ingesting both sheets would put near
duplicate questions in the index, so retrieval would return the same answer
twice and the corpus size would be overstated.

Recommendation: treat the categorised sheets as authoritative (more rows, and
they carry the category metadata the UI needs), then review the 24 `ALL`-only
questions individually and merge the worthwhile ones into a category. The
extractor reports this set under `stats.cross_sheet.only_in_all_sheet`.

### 3.3 Data quality defects — must fix before loading

The extractor flags **48 of 163 rows**. Measured breakdown:

| Count | Defect |
|---|---|
| 20 | Characters missing versus the raw PDF row |
| 13 | Question text garbled by column bleed |
| 12 | Answer text garbled by column bleed |
| 6 | Answer is a fragment of another row's answer |
| 4 | Answer shorter than the same question on the other sheet |
| 2 | Open question answered yes/no |
| 2 | Empty question |
| 1 | Wrapped tail recovered from column 0 |

The flag set was revised on 2026-08-17 after an adversarial test pass. Three
rules were removed as unreliable — a bare "answer under 15 characters" test
(13 of 16 hits were correct one-word answers) and "answer duplicated within the
same sheet" (all 8 hits were legitimate reused boilerplate), plus a
question-punctuation test (at least 10 of 37 hits were complete topic labels).
They were replaced by one measured rule: squash each extracted row and compare
its length against the same row read by `pypdf`, flagging any shortfall. That
single check subsumes all three and found two truncated answers the old rules
missed entirely.

Known accepted false positives: 2 of the 6 fragment hits are reused boilerplate
(the same closing sentence answering two questions). Fragment matching must stay
unanchored because the page-1 defect sits mid-string, and a false positive costs
a reviewer seconds whereas an unflagged bad answer reaches students.

Two known-bad rows on page 1 carry fragments of question 4's answer ("Who can
certify the above documents?"):

| # | Question | Answer in PDF | Correct? |
|---|---|---|---|
| 10 | Is the programme full time or part time? | "The School Principal, Government Officers or Commissioner of Oath." | Wrong |
| 11 | Where can I get information on scholarships? | "Respective embassy" | Wrong |

Note these are *fragments*, not exact copies, so equality-based duplicate
detection cannot find them; the extractor uses substring containment.

**Root cause of the truncation and garbling:** in the source PDF some question
text overflows its column and physically overlaps the answer text. `pdfplumber`
clips at the column boundary and interleaves the overlap; `pypdf` concatenates
the same rows readably. The extractor therefore attaches a `source_text` field
from `pypdf` to every flagged row so a reviewer can restore the intended split
without reopening the PDF.

**A grounded chatbot repeats all of this faithfully.** A manual review pass is a
prerequisite for every option below, not an optional cleanup.

### 3.4 Note on scale

~10,000 tokens is small. This single fact eliminates the need for a vector
database, document chunking, and most of the standard RAG tooling. Any design
below that proposes those is over-engineering for this dataset size.

## 4. Target hardware

Development and demo machine:

```
GPU:  NVIDIA RTX 3050 Ti Laptop — 4 GB VRAM
RAM:  7.4 GB total
CPU:  AMD Ryzen 5 5600H
Disk: 135 GB free
```

RAM is the binding constraint. With PostgreSQL, Django, Vite, VS Code and a
browser already running, roughly 2–3 GB is realistically free. This rules out
running a general-purpose chat LLM locally at usable quality (see Option D).

## 5. Implementation options

### Option A — Keyword matching (current)

Literal substring matching against a fixed rule chain.

| | |
|---|---|
| Cost | Free |
| Offline | Yes |
| Hallucination risk | None |
| Understands paraphrases | **No** |
| Verdict | **Rejected** — this is the problem being solved |

### Option B — Local embedding search (no LLM)

An embedding model converts each FAQ question into a vector representing its
meaning. Incoming questions are converted the same way; the nearest vector wins
and its stored answer is returned verbatim.

Sentences with no shared words still match when they mean the same thing:

```
"how long can I take to finish my master?"       → [0.21, -0.88, 0.34, ...]
"What is the official duration of the PhD and    → [0.19, -0.85, 0.31, ...]  near
 Master's?"
"How do I apply for a PTPTN loan?"               → [0.77,  0.12, -0.60, ...]  far
```

Candidate libraries:

| Library | Size | Notes |
|---|---|---|
| `fastembed` | ~50 MB | ONNX, no PyTorch. Best fit for 7.4 GB RAM. |
| `sentence-transformers` | ~2.5 GB disk | Standard in literature, easier to cite. |

| | |
|---|---|
| Cost | **Free forever** |
| Offline | **Yes** |
| Hallucination risk | **Structurally impossible** — returns stored text |
| Latency | ~10 ms |
| Measurable accuracy | **Yes** — top-1 / top-3 against a labelled test set |
| Limitation | Returns FAQ answers verbatim; no conversational rephrasing |

Confidence handling:

- High score → return the matched answer.
- Medium score → return top 3 and let the student choose.
- Below threshold → refuse and route to the relevant office email.

That threshold refusal is what enforces "restricted to the FAQ." It is a
numeric guarantee, not a behavioural request to a model.

### Option C — Grounded LLM, full FAQ in the prompt

Send the entire FAQ (~10k tokens) as context with every question, instructing
the model to answer only from it and to cite the FAQ number used.

| | |
|---|---|
| Cost | Paid API, or heavy free-tier usage |
| Offline | No |
| Hallucination risk | Low but non-zero |
| Quality | **Highest** — natural, conversational |
| Free-tier viability | **Poor** — see section 6 |

Prompt caching cuts repeat cost to roughly 10% of full price on paid tiers.

### Option D — Self-hosted local LLM (Ollama)

Run an open-weight model (Llama, Qwen, Mistral) locally.

**Not viable on this hardware.** 4 GB VRAM limits the choice to a ~3B parameter
model, and small models degrade badly when handling a 10k-token context — they
lose track and begin inventing answers, which is the exact failure this project
must avoid. It would also contend for the 7.4 GB of system RAM already shared
with PostgreSQL, Django and Vite.

Worth documenting as *considered and rejected with reasons*; that is a
legitimate report finding, not a gap.

Note: "train our own model from scratch" is out of scope entirely — it requires
compute and datasets several orders of magnitude beyond an FYP. "Self-hosted"
in this document always means running a pre-trained open-weight model.

### Option E — Hybrid: local retrieval + LLM phrasing (recommended)

Combine B and C. Retrieval runs locally and free; the LLM sees only the handful
of entries retrieval already selected.

```
Student question
      ↓
[1] Embedding search — local, free, unlimited
      ~200 Q&As  →  top 3 relevant        (~500 tokens)
      ↓
[2] LLM — receives only those 3 + the question   (~700 tokens)
      "Answer using only these FAQ entries. Cite the number."
      ↓
Conversational answer + citation
```

The LLM's job shrinks from *searching* to *phrasing*. This is what makes free
tiers viable (section 6) and adds a natural failure path:

```python
if llm_available:
    return llm_rephrase(top_matches, question)   # conversational
else:
    return top_matches[0].answer                  # verbatim, still correct
```

If the API is rate-limited, down, or the venue has no wifi, the chatbot degrades
from conversational to a very good search tool. It does not break. For a live
viva demonstration this property is worth more than answer polish.

## 6. Free-tier API analysis

Checked 2026-08-17. These limits change frequently — re-verify before relying on
them.

| | Groq | Google Gemini |
|---|---|---|
| Credit card required | **No** | No |
| Requests / minute | **30** | 5–15 (model-dependent) |
| Requests / day | ~1,000 | 100–1,000 |
| **Tokens / minute** | **8K–12K** | Higher, fewer RPM |
| Models | Open-weight only (Llama 3.3 70B, gpt-oss-120b) | Gemini 2.5 Flash / Pro |

### 6.1 Why tokens-per-minute decides the architecture

Groq's free tier allows ~12,000 TPM on Llama 3.3 70B.

**Option C (whole FAQ, ~10k tokens per question):**

```
10,000 tokens ÷ 12,000 TPM  ≈  1 question per minute
```

Effectively single-user. Two concurrent students exhaust the limit, and growth
toward 200 Q&As makes it worse.

**Option E (top-3 only, ~700 tokens per question):**

```
700 tokens ÷ 12,000 TPM  ≈  17 questions per minute
```

The binding limit becomes the 30 RPM cap, which normal use will not reach.
~1,000 requests/day is ample for a demo or a small pilot. Growing to 200 Q&As
changes nothing, because payload size is fixed by the top-3 selection rather
than by corpus size.

**Conclusion: retrieval-first is what makes a free tier usable at all.**

### 6.2 Paid reference costs

| Model | Input / Output per million tokens |
|---|---|
| Claude Opus 5 | $5 / $25 |
| Claude Haiku 4.5 | $1 / $5 |

With Option E's ~700-token payloads, per-question cost is a small fraction of a
cent on either.

### 6.3 Non-cost considerations

- **Free tiers generally train on submitted data.** Google's free tier uses
  submitted content to improve their products; paid tiers do not. Acceptable for
  a demo with generic FAQ questions; a genuine privacy question for real student
  queries in production. Belongs in the report's limitations section.
- **API keys must live in the Django backend only.** Anything prefixed `VITE_`
  is compiled into the browser bundle and publicly readable. The existing
  production canary test that scans the bundle for secrets already enforces this
  posture.
- **`PROJECT_REQUIREMENTS.md:178`** states that generated Gemini / AI Studio
  environment requirements are out of scope for the frontend and must not be
  required to run the app. Backend-side integration respects that decision.

## 7. Comparison summary

| | A: Keyword | B: Embeddings | C: Full-FAQ LLM | D: Local LLM | E: Hybrid |
|---|---|---|---|---|---|
| Cost | Free | **Free** | Paid | Free | **Free tier** |
| Works offline | Yes | **Yes** | No | Yes | Degrades gracefully |
| Understands meaning | **No** | Yes | Yes | Yes | Yes |
| Cannot hallucinate | Yes | **Yes** | No | No | Partial |
| Conversational | No | No | **Yes** | Yes | **Yes** |
| Runs on this laptop | Yes | **Yes** | n/a | **No** | Yes |
| Measurable accuracy | Weak | **Yes** | Harder | Harder | **Yes** |

## 8. Recommendation

Build in layers. Each layer is independently shippable and defensible.

| Step | Delivers | Cost |
|---|---|---|
| 1. Embedding retrieval (Option B) | Semantic understanding, measurable accuracy, offline | Free |
| 2. + Groq free tier (Option E) | Conversational phrasing | Free |
| 3. + paid API (optional) | Best quality, no rate limits | Cents |

Step 1 is the FYP core and the evaluation chapter. Step 2 is cost-free polish.
Step 3 is a flag flip if ever needed.

Prefer **Groq over Gemini** for step 2: triple the RPM, no credit card, and
provider swap is trivial given the small payload.

### 8.1 Swappable retriever

Keep the matching step behind one interface so the endpoint contract never
changes:

```
FaqRetriever ─┬─→ EmbeddingRetriever  (free, local, default)
              ├─→ GroqRetriever       (free tier, conversational)
              └─→ ClaudeRetriever     (paid, optional)
```

Selected by an environment flag, mirroring the existing
`VITE_USE_PANEL_BACKEND` / `VITE_USE_MARKS_BACKEND` pattern.

## 9. Proposed backend shape

New Django `faq` app, following the structure of `marks` and `dashboard`:

| Component | Responsibility |
|---|---|
| `FaqCategory` | The 7 sections |
| `FaqEntry` | Question, answer, category, source number, active flag |
| `FaqEmbedding` | Cached vector per entry, rebuilt on edit |
| `UnansweredQuestion` | Logged whenever confidence falls below threshold |
| `POST /api/faq/ask/` | Question in; answer + cited entry IDs + confidence out |
| `GET/POST/PATCH /api/faq/entries/` | Office Staff CRUD, feeding `AcademicFAQEditor` |

Role gating follows the established project convention: students may ask;
only Office Staff/Admin may edit entries. Authorization is enforced in the
backend, never by frontend route visibility.

## 10. Why this strengthens the FYP

- **Citations.** Returning the FAQ number behind each answer lets the panel
  verify every response traces to a real entry — the direct answer to "how do
  you know it isn't hallucinating?"
- **Measurable evaluation.** A labelled set of ~100 paraphrased questions yields
  reportable top-1 / top-3 accuracy figures. Substantially stronger than "I
  called an API and it worked."
- **Self-improving loop.** Logged unanswered questions show Office Staff exactly
  what students ask that the FAQ does not cover; they add entries through the
  existing `AcademicFAQEditor`. This directly matches the panel's feedback that
  the system should streamline existing workflows rather than replace tools.
- **Demo reliability.** The offline path cannot be broken by venue wifi.
- **Documented rejection of Option D.** Considered, measured against hardware,
  rejected with reasons — a finding in its own right.

## 11. Prerequisites and open questions

Prerequisite for every option:

1. Parse `FAQ.pdf` into structured JSON.
2. Manually correct the defective rows (section 3.2) and review all ~156 entries.
3. Decide whether `FAQ.pdf` moves into `docs/` for version tracking.

Open questions:

- Should answers containing URLs render as clickable links in the chat UI?
- Should the chatbot be scoped per category, or search all entries at once?
- Retention policy for logged unanswered questions (they may contain personal
  details typed by students).

## 12. Next step

Once an approach is chosen, write the matching implementation plan to
`docs/superpowers/plans/2026-08-17-faq-chatbot.md` following the existing
plan/spec convention.

## Sources

Free-tier figures verified 2026-08-17:

- https://www.grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026-what-you-actually-get-uwysd6mb
- https://pricepertoken.com/endpoints/groq/free
- https://harboratory.com/gemini-api-free-tier-limits-in-2026-explained/
- https://www.aifreeapi.com/en/posts/gemini-api-rate-limits-per-tier
