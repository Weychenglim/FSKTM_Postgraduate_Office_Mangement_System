# FAQ Chatbot Implementation Plan

> **For agentic workers:** Implement task-by-task, in order. Steps use checkbox (`- [ ]`) syntax for tracking. Do not begin Phase 1 until Phase 0 is signed off by a human — every later phase inherits the correctness of that data.

**Goal:** Replace the hardcoded keyword chain in the student FAQ chatbot with semantic retrieval over the official FSKTM FAQ, so a student's paraphrased question finds the right entry, and any question the FAQ does not cover is explicitly refused rather than answered from a model's general knowledge.

**Architecture:** A new Django `faq` app owns FAQ categories, entries, cached embeddings, and unanswered-question logging. An embedding model converts each FAQ question into a vector once; incoming questions are embedded and matched by cosine similarity in memory. A confidence threshold decides between answering, offering the top three, or refusing with a contact route. The React chatbot calls one endpoint and renders the answer with its cited entry. An optional LLM phrasing layer sits behind the same endpoint and is never required for correctness.

**Tech Stack:** Django REST Framework, `fastembed` (ONNX, CPU), NumPy, Django TestCase/APITestCase, React, TypeScript, Vite, Node `tsx` for focused frontend tests, Tailwind CSS.

**Design reference:** `docs/superpowers/specs/2026-08-17-faq-chatbot-design.md`

---

## Scope

In scope: Phases 0–4 (free, local, offline-capable, measurable).

Out of scope for this plan: Phase 5 (LLM phrasing) is specified but optional and must not be a dependency of any earlier phase. Option D (self-hosted chat LLM) is rejected on hardware grounds — see design section 5.

---

## File Map

**Data**
- Create `docs/faq/faq-entries.json`: reviewed FAQ dataset, version-tracked.
- Create `docs/faq/evaluation-set.json`: labelled paraphrase questions for accuracy measurement.
- Create `scripts/parse_faq_pdf.py`: one-off PDF → JSON extractor with defect flagging.

**Backend**
- Create `backend/faq/__init__.py`, `apps.py`, `admin.py`
- Create `backend/faq/models.py`: `FaqCategory`, `FaqEntry`, `FaqEmbedding`, `UnansweredQuestion`.
- Create `backend/faq/migrations/0001_initial.py`
- Create `backend/faq/embeddings.py`: embedding-model wrapper and index cache.
- Create `backend/faq/retrieval.py`: cosine similarity search and confidence banding.
- Create `backend/faq/services.py`: `answer_question()` orchestration and unanswered logging.
- Create `backend/faq/serializers.py`
- Create `backend/faq/views.py`: ask endpoint plus Office Staff/Admin entry CRUD.
- Create `backend/faq/urls.py`
- Create `backend/faq/management/commands/load_faq.py`: idempotent dataset loader.
- Create `backend/faq/management/commands/rebuild_faq_embeddings.py`
- Create `backend/faq/tests.py`: model, permission, and endpoint coverage.
- Create `backend/faq/test_retrieval.py`: accuracy measurement against the evaluation set.
- Modify `backend/config/settings.py`: add `faq` to `INSTALLED_APPS`, add FAQ settings block.
- Modify `backend/config/urls.py`: mount `/api/faq/`.
- Modify `backend/requirements.txt`: add `fastembed`, `numpy`.
- Modify `backend/.env.example`: document FAQ threshold and model variables.
- Modify `.gitignore`: ignore the downloaded embedding-model cache.

**Frontend**
- Create `frontend/src/types/faq.ts`
- Create `frontend/src/services/faqApi.ts`
- Create `frontend/src/mocks/faq.ts`
- Create `frontend/src/utils/faqConfidence.ts` and `faqConfidence.test.ts`
- Modify `frontend/src/components/StudentFAQChatbot.tsx`: replace the keyword chain.
- Modify `frontend/src/components/AcademicFAQEditor.tsx`: wire to live CRUD.
- Modify `frontend/src/services/index.ts`: export the new service.
- Modify `frontend/src/vite-env.d.ts`: declare `VITE_USE_FAQ_BACKEND`.
- Modify `frontend/.env.example`: document `VITE_USE_FAQ_BACKEND`.

**Governance**
- Modify `PROJECT_REQUIREMENTS.md`, `ARCHITECTURE_AND_CODING_DESIGN.md`, `PROJECT_STATUS.md`.

---

## Phase 0 — Data preparation (human sign-off required)

### Task 0.1: Extract the PDF

**Files:** Create `scripts/parse_faq_pdf.py`, create `docs/faq/faq-entries.json`

- [ ] **Step 1: Write the extractor**

Parse the `NO. | QUESTION | ANSWER` tables. Emit one record per row:

```json
{
  "category": "STUDENT APPLICATION",
  "source_number": 9,
  "question": "What is the official duration of the PhD and Master's?",
  "answer": "Master coursework: Minimum 3 semester ...",
  "needs_review": false,
  "review_note": ""
}
```

- [ ] **Step 2: Flag likely defects automatically**

Set `needs_review: true` with a reason when a row shows any of:
- an answer identical to another row's answer (the known page-1 defect),
- an answer shorter than 15 characters,
- an answer that does not respond to the question form (e.g. `"No."` against a "Where can I…" question),
- a truncated or empty question.

- [ ] **Step 3: Normalise the category typo**

Map `STUDENT APPLCATION` → `STUDENT APPLICATION`. Record the original spelling in a `source_category` field so the mapping is auditable.

### Task 0.2: Human review — BLOCKING

**Files:** Modify `docs/faq/faq-entries.json`

- [ ] **Step 1: Correct the known defects**

Rows 10 and 11 of `STUDENT APPLICATION` carry answers belonging to row 4:

| # | Question | Current answer | Action |
|---|---|---|---|
| 10 | Is the programme full time or part time? | "The School Principal, Government Officers or Commissioner of Oath." | Replace |
| 11 | Where can I get information on scholarships? | "Respective embassy" | Replace |

- [ ] **Step 2: Review every flagged row**, then all remaining rows.
- [ ] **Step 3: Clear `needs_review` only when verified.** Loading refuses while any flag remains (Task 1.3).

> **Correct answers must come from the Postgraduate Office, not inference.** A grounded chatbot repeats this file verbatim. Every downstream accuracy number is meaningless if this step is skipped.

- [ ] **Step 4: Decide whether `FAQ.pdf` moves into `docs/`** so the source is version-tracked beside the extract.

---

## Phase 1 — Django `faq` app

### Task 1.1: Models and migration

**Files:** Create `backend/faq/models.py`, `backend/faq/migrations/0001_initial.py`

- [ ] **Step 1: Define the models**

Follow the constraint style already used in `appointments` and `marks` — enforce rules in the database, not only in views.

```python
class FaqEntry(models.Model):
    category = models.ForeignKey(FaqCategory, on_delete=models.PROTECT, related_name="entries")
    source_number = models.PositiveIntegerField()
    question = models.TextField()
    answer = models.TextField()
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["category__display_order", "source_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["category", "source_number"],
                name="unique_faq_number_per_category",
            )
        ]
```

`FaqEmbedding` is a `OneToOneField` on `FaqEntry` holding `model_name` (CharField) and `vector` (JSONField). `UnansweredQuestion` stores the question text, the best score and entry seen, the asking user (nullable), and a `resolved` flag.

- [ ] **Step 2: Register `faq` in `INSTALLED_APPS`** and mount `/api/faq/` in `config/urls.py`.
- [ ] **Step 3: Generate and apply the migration.**
- [ ] **Step 4: Verify** `python manage.py check` and `makemigrations --check --dry-run` are clean.

### Task 1.2: Django Admin

**Files:** Create `backend/faq/admin.py`

- [ ] **Step 1:** Register all four models with list displays and search, mirroring `marks/admin.py`. Saving an entry must invalidate its embedding (Task 2.2).

### Task 1.3: Dataset loader

**Files:** Create `backend/faq/management/commands/load_faq.py`, `backend/faq/tests.py`

- [ ] **Step 1: Write a failing test** asserting the command refuses a dataset containing any `needs_review: true` row, and mutates nothing.

```python
def test_load_faq_refuses_unreviewed_dataset(self):
    path = self.write_dataset([{"category": "X", "source_number": 1,
                                "question": "q", "answer": "a",
                                "needs_review": True}])
    with self.assertRaises(CommandError):
        call_command("load_faq", path)
    self.assertEqual(FaqEntry.objects.count(), 0)
```

- [ ] **Step 2: Implement the loader** — validate the whole file first, then write inside one `transaction.atomic()`.
- [ ] **Step 3: Make it idempotent.** Re-running updates existing entries by `(category, source_number)` and never duplicates. Add a test that runs it twice and asserts a stable count.
- [ ] **Step 4: Deactivate, never delete.** Entries absent from the dataset get `is_active=False`, so `UnansweredQuestion` foreign keys survive.

---

## Phase 2 — Retrieval

### Task 2.1: Embedding wrapper

**Files:** Create `backend/faq/embeddings.py`, modify `backend/requirements.txt`, `.gitignore`

- [ ] **Step 1: Add `fastembed` and `numpy`** to requirements.

> `fastembed` downloads its model (~80 MB) on first use and caches it. **First run needs internet; every run after is offline.** Ignore the cache directory and document this in the backend README.

- [ ] **Step 2: Expose one function**, `embed_texts(list[str]) -> list[list[float]]`, with the model name read from settings so it can be swapped without touching call sites.
- [ ] **Step 3: Load the model lazily and once per process.** Do not load it at import time — that would slow `manage.py` and the test suite.

### Task 2.2: Embedding index

**Files:** Create `backend/faq/management/commands/rebuild_faq_embeddings.py`

- [ ] **Step 1:** Build embeddings for every active entry, storing `model_name` alongside each vector.
- [ ] **Step 2: Cache the matrix in memory** as a NumPy array on first search; invalidate when any entry or embedding changes. 200 entries × 384 dimensions is small enough that no vector database is warranted.
- [ ] **Step 3: Treat a `model_name` mismatch as stale** and require a rebuild rather than comparing incompatible vectors.

### Task 2.3: Search and confidence

**Files:** Create `backend/faq/retrieval.py`, modify `backend/faq/tests.py`

- [ ] **Step 1: Write failing tests** for cosine ranking on a small fixture — a paraphrase must outrank a keyword-overlapping but semantically unrelated entry.
- [ ] **Step 2: Implement `search(question, k)`** returning `(entry, score)` pairs, descending.
- [ ] **Step 3: Implement three confidence bands** with thresholds from settings:

| Band | Behaviour |
|---|---|
| `score >= HIGH` | Answer directly, cite the entry |
| `AMBIGUOUS <= score < HIGH` | Return top 3, let the student choose |
| `score < AMBIGUOUS` | Refuse, log, route to a contact |

Start with `HIGH = 0.70`, `AMBIGUOUS = 0.45` as placeholders. **These are calibrated in Phase 4, not guessed here.**

### Task 2.4: The ask endpoint

**Files:** Create `backend/faq/services.py`, `serializers.py`, `views.py`, `urls.py`

- [ ] **Step 1: Write failing API tests** covering: an anonymous request returns `401`; a student gets a high-confidence answer with a cited entry ID; an off-topic question returns `answered: false` and creates exactly one `UnansweredQuestion`.
- [ ] **Step 2: Implement `POST /api/faq/ask/`.**

```
Request:  { "question": "how long can I take to finish my master?" }
Response: { "answered": true,
            "confidence": 0.81,
            "answer": "Master coursework: Minimum 3 semester ...",
            "matches": [ { "id": 9, "question": "...", "category": "...", "score": 0.81 } ],
            "fallbackContact": null }
```

- [ ] **Step 3: Log every refusal** to `UnansweredQuestion` with the best score seen.
- [ ] **Step 4: Rate-limit the endpoint** with a settings-backed DRF scope, reusing the `accounts/throttles.py` pattern.
- [ ] **Step 5: Never echo the student's text back into the answer field** — it is untrusted input rendered in other users' admin views.

### Task 2.5: Entry CRUD

**Files:** Modify `backend/faq/views.py`, `urls.py`, `tests.py`

- [ ] **Step 1: Write failing permission tests.** Students may `GET` active entries; only Office Staff/Admin may create, update, delete, or read `UnansweredQuestion`. Every other role gets `403`.
- [ ] **Step 2: Implement the endpoints.** Role checks live in the backend — frontend route visibility is never treated as authorization.
- [ ] **Step 3: Invalidate the affected embedding on write** so an edited answer cannot be served against a stale vector.

---

## Phase 3 — Frontend

### Task 3.1: Types and service

**Files:** Create `frontend/src/types/faq.ts`, `services/faqApi.ts`, `mocks/faq.ts`

- [ ] **Step 1: Mirror the API contract** in TypeScript.
- [ ] **Step 2: Follow the established service pattern** — `VITE_USE_FAQ_BACKEND` defaulting to `true`, mock fallback for reads, as in `timelineApi.ts`.
- [ ] **Step 3: Declare the flag** in `vite-env.d.ts` and `.env.example`.

### Task 3.2: Confidence helper

**Files:** Create `frontend/src/utils/faqConfidence.ts` + `.test.ts`

- [ ] **Step 1: Write failing tests** for a pure function mapping a response to `'answered' | 'ambiguous' | 'unanswered'`.
- [ ] **Step 2: Implement it.** Keep it pure so it is testable with `tsx` and no DOM.

### Task 3.3: Replace the keyword chain

**Files:** Modify `frontend/src/components/StudentFAQChatbot.tsx`

- [ ] **Step 1: Delete the `if/else` chain** at lines 112–131 and call `faqApi.askFaq()`.
- [ ] **Step 2: Render all three states** — a cited answer, a top-3 chooser, and a refusal with the contact route.
- [ ] **Step 3: Show the citation** (category + source number) beneath each answer. This is the panel-facing evidence that answers trace to real entries.
- [ ] **Step 4: Handle loading, network failure, and `429`** using the shared `authErrorMessage` pattern.
- [ ] **Step 5: Render URLs in answers as clickable links** — many answers are bare URLs. Escape all other content.

### Task 3.4: Wire the editor

**Files:** Modify `frontend/src/components/AcademicFAQEditor.tsx`

- [ ] **Step 1: Replace mock state with live CRUD.**
- [ ] **Step 2: Add an Unanswered Questions view** so Office Staff can see what students asked that the FAQ does not cover, and create an entry from it.

> This closes the self-improving loop and is the module's strongest link to the panel's "streamline existing workflows" feedback.

- [ ] **Step 3: Use shared portal primitives** (`PortalButton`, `PageHeader`, `StatusBadge`, `PortalToast`) — no browser-native `confirm()` or `alert()`.

---

## Phase 4 — Evaluation

### Task 4.1: Build the evaluation set

**Files:** Create `docs/faq/evaluation-set.json`

- [ ] **Step 1: Write ~100 paraphrased questions**, each labelled with the FAQ entry that should win. Cover all 7 categories.
- [ ] **Step 2: Include ~20 off-topic questions** that must be refused — these measure the refusal path, which is the "restricted to FAQ" claim.
- [ ] **Step 3: Write them as a student would**, including informal phrasing and typos. Paraphrases lifted from the FAQ's own wording inflate the score and prove nothing.

### Task 4.2: Measure and calibrate

**Files:** Create `backend/faq/test_retrieval.py`

- [ ] **Step 1: Report top-1 accuracy, top-3 accuracy, and false-answer rate** on off-topic questions.
- [ ] **Step 2: Sweep the thresholds** and pick values balancing "answers correctly" against "refuses when it should".
- [ ] **Step 3: Record the chosen values and their measured numbers** in `PROJECT_STATUS.md`. These are the report's results.
- [ ] **Step 4: Add a regression floor** — a test that fails if top-3 accuracy drops below the recorded baseline.

---

## Phase 5 — Optional LLM phrasing (not required)

Only after Phases 0–4 pass.

- [ ] **Step 1: Define a `FaqResponder` interface** with `EmbeddingResponder` (default) and one API-backed implementation behind it.
- [ ] **Step 2: Send only the top 3 entries**, never the whole FAQ — see design section 6.1 for why this is what makes a free tier usable.
- [ ] **Step 3: Fall back to the verbatim answer** on any API error, timeout, or rate limit. The chatbot must never be worse than Phase 4.
- [ ] **Step 4: Keep the key in `backend/.env`.** Never a `VITE_` variable — those compile into the public bundle.
- [ ] **Step 5: Note in the report** that free tiers may train on submitted data.

---

## Verification

Run before declaring any phase complete:

```
# backend/
.venv/Scripts/python.exe manage.py check
.venv/Scripts/python.exe manage.py makemigrations --check --dry-run
.venv/Scripts/python.exe manage.py test faq --keepdb

# frontend/
npm run lint
npm run build
npx tsx src/utils/faqConfidence.test.ts
```

Then browser-smoke the chatbot as Student and the editor as Office Staff/Admin.

---

## Governance updates

Required by repo convention once implementation lands:

- [ ] `PROJECT_REQUIREMENTS.md` — FAQ chatbot behaviour, refusal guarantee, role permissions.
- [ ] `ARCHITECTURE_AND_CODING_DESIGN.md` — the `faq` app, retrieval design, `VITE_USE_FAQ_BACKEND`.
- [ ] `PROJECT_STATUS.md` — completed items, measured accuracy, and remaining known issues.

---

## Risks

| Risk | Mitigation |
|---|---|
| FAQ answers are wrong in the source | Phase 0 blocking review; loader refuses flagged rows |
| Threshold too low → confident wrong answers | Phase 4 calibration; measure false-answer rate explicitly |
| Threshold too high → refuses everything | Same sweep, both directions |
| First-run model download needs internet | Document it; pre-download before any demo |
| 7.4 GB RAM shared with Postgres/Django/Vite | `fastembed` (~50 MB) chosen over `sentence-transformers` (~2.5 GB) |
| Scope creep into Phase 5 | Phases 0–4 must stand alone and ship first |
