"""Measuring the chatbot on the evaluation set (docs/faq/evaluation-set.json).

Each question is run through three versions of the search: keywords only,
meaning only, and both combined. The rankings are kept, so the two cut-offs
can then be swept without searching again.
"""
import json
import time
from dataclasses import dataclass
from pathlib import Path

from .importer import default_path
from .models import FaqEntry
from .search import MAX_CHOICES, NONE, POSSIBLE, STRONG, search

VERSIONS = {
    "keywords": {"use_meaning": False, "use_keywords": True},
    "meaning": {"use_meaning": True, "use_keywords": False},
    "combined": {"use_meaning": True, "use_keywords": True},
}
# A wrong answer misleads a student, so it costs more than a missed one.
WRONG_COST = 2.0
CHOICE_CREDIT = 0.5
OFF_TOPIC_CHOICE_COST = 0.25


class EvaluationProblem(Exception):
    pass


def evaluation_path():
    return default_path().parent / "evaluation-set.json"


def load_items(path=None):
    """The questions with their expected entries as ids, and any references
    that are not published entries any more."""
    data = json.loads(Path(path or evaluation_path()).read_text(encoding="utf-8"))
    published = dict(FaqEntry.objects.published().exclude(source_ref=None).values_list("source_ref", "pk"))
    if not published:
        raise EvaluationProblem("No published entries came from the FAQ import. Run import_faq first.")
    items, missing = [], set()
    for item in data["items"]:
        expected = {published[ref] for ref in item["expected"] if ref in published}
        missing.update(ref for ref in item["expected"] if ref not in published)
        if item["expected"] and not expected:
            continue
        items.append({"question": item["question"], "kind": item["kind"], "expected": expected})
    return items, sorted(missing)


@dataclass
class Run:
    question: str
    kind: str
    expected: set
    ranked: list
    seconds: float


def collect(items, version):
    runs = []
    for item in items:
        started = time.perf_counter()
        ranked, _ = search(item["question"], **VERSIONS[version])
        runs.append(
            Run(
                question=item["question"],
                kind=item["kind"],
                expected=item["expected"],
                ranked=[(candidate.item.entry_id, candidate.confidence) for candidate in ranked[:10]],
                seconds=time.perf_counter() - started,
            )
        )
    return runs


def decide(ranked, strong, possible):
    """The same decision as search.find, on a stored ranking."""
    if not ranked:
        return NONE, []
    ordered = list(ranked)
    leader = max(ordered[:MAX_CHOICES], key=lambda pair: pair[1])
    if leader is not ordered[0] and leader[1] >= strong > ordered[0][1]:
        ordered = [leader, *(pair for pair in ordered if pair is not leader)]
    confidence = ordered[0][1]
    band = STRONG if confidence >= strong else POSSIBLE if confidence >= possible else NONE
    return band, [entry for entry, _ in ordered]


def score(runs, strong, possible):
    in_scope = [run for run in runs if run.expected]
    off_topic = [run for run in runs if not run.expected]
    counts = {"answered": 0, "choices": 0, "wrong": 0, "top1": 0, "top3": 0, "offRefused": 0, "offAnswered": 0, "offChoices": 0}
    by_kind = {}
    for run in in_scope:
        band, ordered = decide(run.ranked, strong, possible)
        right_first = bool(ordered) and ordered[0] in run.expected
        counts["top1"] += right_first
        counts["top3"] += bool(run.expected & set(ordered[:MAX_CHOICES]))
        kind = by_kind.setdefault(run.kind, {"questions": 0, "answered": 0, "helped": 0})
        kind["questions"] += 1
        if band == STRONG:
            if right_first:
                counts["answered"] += 1
                kind["answered"] += 1
                kind["helped"] += 1
            else:
                counts["wrong"] += 1
        elif band == POSSIBLE and run.expected & set(ordered[:MAX_CHOICES]):
            counts["choices"] += 1
            kind["helped"] += 1
    for run in off_topic:
        band, _ = decide(run.ranked, strong, possible)
        counts["offRefused"] += band == NONE
        counts["offAnswered"] += band == STRONG
        counts["offChoices"] += band == POSSIBLE
    total, off = len(in_scope) or 1, len(off_topic) or 1
    utility = (
        counts["answered"]
        + CHOICE_CREDIT * counts["choices"]
        - WRONG_COST * (counts["wrong"] + counts["offAnswered"])
        - OFF_TOPIC_CHOICE_COST * counts["offChoices"]
    )
    return {
        "strong": round(strong, 2),
        "possible": round(possible, 2),
        "questions": len(in_scope),
        "offTopic": len(off_topic),
        "top1": round(100 * counts["top1"] / total, 1),
        "top3": round(100 * counts["top3"] / total, 1),
        "answeredRight": round(100 * counts["answered"] / total, 1),
        "helped": round(100 * (counts["answered"] + counts["choices"]) / total, 1),
        "wrongAnswers": counts["wrong"] + counts["offAnswered"],
        "offTopicRefused": round(100 * counts["offRefused"] / off, 1),
        "milliseconds": round(1000 * sum(run.seconds for run in runs) / max(len(runs), 1), 1),
        "byKind": {
            kind: {**values, "answeredPercent": round(100 * values["answered"] / values["questions"], 1), "helpedPercent": round(100 * values["helped"] / values["questions"], 1)}
            for kind, values in sorted(by_kind.items())
        },
        "utility": round(utility, 2),
    }


def sweep(runs):
    """The cut-offs that serve students best on this set."""
    best = None
    for strong_step in range(30, 96):
        strong = strong_step / 100
        for possible_step in range(20, strong_step + 1):
            possible = possible_step / 100
            result = score(runs, strong, possible)
            key = (result["utility"], -result["wrongAnswers"], strong)
            if best is None or key > best[0]:
                best = (key, result)
    return best[1]


# The rule the cut-offs are chosen by: answer as many questions right as
# possible, while giving at most this many wrong answers and refusing at
# least this share of off-topic questions.
MAX_WRONG = 2
MIN_OFF_TOPIC_REFUSED = 90


def choose(runs, max_wrong=MAX_WRONG, min_refused=MIN_OFF_TOPIC_REFUSED):
    best = None
    for strong_step in range(30, 96):
        for possible_step in range(20, strong_step + 1):
            result = score(runs, strong_step / 100, possible_step / 100)
            if result["wrongAnswers"] > max_wrong or result["offTopicRefused"] < min_refused:
                continue
            key = (result["answeredRight"], result["helped"], -result["wrongAnswers"], strong_step)
            if best is None or key > best[0]:
                best = (key, result)
    return best[1] if best else None
