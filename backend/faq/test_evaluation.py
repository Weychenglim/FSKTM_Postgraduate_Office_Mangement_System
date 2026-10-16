"""The chatbot must not get worse (C6). These run the evaluation set against
the imported office FAQ; the floors sit just under what was measured on
2026-10-16 (docs/faq/evaluation-results.json)."""
import json
import os
from unittest import skipUnless

from django.test import TestCase, override_settings

from .encoder import reset_encoder
from .evaluation import Run, choose, collect, decide, evaluation_path, load_items, score
from .importer import default_path, import_faq
from .search import NONE, POSSIBLE, STRONG, clear_index


class EvaluationSetTests(TestCase):
    def test_the_set_is_sound(self):
        data = json.loads(evaluation_path().read_text(encoding="utf-8"))
        known = {row["id"] for row in json.loads(default_path().read_text(encoding="utf-8"))["entries"]}
        kinds = [item["kind"] for item in data["items"]]
        self.assertEqual(len(kinds), 122)
        self.assertEqual(kinds.count("malay"), 20)
        self.assertEqual(kinds.count("off_topic"), 20)
        for item in data["items"]:
            self.assertEqual(not item["expected"], item["kind"] == "off_topic", item["question"])
            self.assertTrue(set(item["expected"]) <= known, item["question"])
        self.assertEqual(len({item["question"].casefold() for item in data["items"]}), 122)

    def test_the_decision_and_the_rule(self):
        self.assertEqual(decide([], 0.7, 0.4), (NONE, []))
        self.assertEqual(decide([(1, 0.8), (2, 0.5)], 0.7, 0.4), (STRONG, [1, 2]))
        self.assertEqual(decide([(1, 0.5), (2, 0.4)], 0.7, 0.4), (POSSIBLE, [1, 2]))
        self.assertEqual(decide([(1, 0.6), (2, 0.9)], 0.7, 0.4), (STRONG, [2, 1]))
        runs = [
            Run("right", "paraphrase", {1}, [(1, 0.8), (2, 0.3)], 0.01),
            Run("close", "paraphrase", {3}, [(2, 0.6), (3, 0.55)], 0.01),
            Run("away", "off_topic", set(), [(2, 0.45)], 0.01),
        ]
        result = score(runs, 0.7, 0.4)
        self.assertEqual((result["answeredRight"], result["helped"], result["wrongAnswers"], result["offTopicRefused"]), (50.0, 100.0, 0, 0.0))
        chosen = choose(runs, max_wrong=0, min_refused=100)
        self.assertEqual(chosen["offTopicRefused"], 100.0)
        self.assertEqual(chosen["wrongAnswers"], 0)


class RegressionBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_faq()

    def setUp(self):
        reset_encoder()
        clear_index()
        self.addCleanup(reset_encoder)
        self.addCleanup(clear_index)


@override_settings(FAQ_SEARCH="keywords")
class KeywordRegressionTests(RegressionBase):
    def test_keyword_search_alone_keeps_its_level(self):
        items, missing = load_items()
        self.assertEqual(missing, [])
        result = score(collect(items, "keywords"), 0.61, 0.22)
        self.assertGreaterEqual(result["top3"], 72)
        self.assertGreaterEqual(result["helped"], 64)
        self.assertLessEqual(result["wrongAnswers"], 2)
        self.assertGreaterEqual(result["offTopicRefused"], 90)


@skipUnless(os.getenv("FAQ_REAL_MODEL_TESTS") == "1", "Set FAQ_REAL_MODEL_TESTS=1 to run with the real model.")
@override_settings(FAQ_ENCODER="faq.encoder.FastEmbedEncoder", FAQ_SEARCH="hybrid")
class CombinedRegressionTests(RegressionBase):
    def test_the_combined_search_keeps_its_level(self):
        items, _ = load_items()
        result = score(collect(items, "combined"), 0.69, 0.42)
        self.assertGreaterEqual(result["top1"], 88)
        self.assertGreaterEqual(result["top3"], 92)
        self.assertGreaterEqual(result["answeredRight"], 60)
        self.assertGreaterEqual(result["helped"], 86)
        self.assertLessEqual(result["wrongAnswers"], 2)
        self.assertGreaterEqual(result["offTopicRefused"], 90)
