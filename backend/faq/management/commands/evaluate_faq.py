import json
from datetime import date
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from faq.encoder import get_encoder
from faq.evaluation import MAX_WRONG, MIN_OFF_TOPIC_REFUSED, VERSIONS, EvaluationProblem, choose, collect, load_items, score, sweep
from faq.search import clear_index


class Command(BaseCommand):
    help = "Measure the FAQ chatbot on docs/faq/evaluation-set.json: keywords only, meaning only, and combined."

    def add_arguments(self, parser):
        parser.add_argument("--set", default=None, help="The evaluation set (default docs/faq/evaluation-set.json).")
        parser.add_argument("--out", default=None, help="Write the results as JSON here.")

    def handle(self, *args, **options):
        try:
            items, missing = load_items(options["set"])
        except EvaluationProblem as exc:
            raise CommandError(str(exc)) from exc
        if missing:
            self.stdout.write(self.style.WARNING(f"Not published, left out: {', '.join(missing)}"))
        encoder = get_encoder()
        clear_index()
        results = {}
        for version in VERSIONS:
            if version != "keywords" and encoder is None:
                self.stdout.write(self.style.WARNING(f"{version}: the meaning model is not available, skipped."))
                continue
            runs = collect(items, version)
            results[version] = {"rule": choose(runs), "best score": sweep(runs)}
            if version == "combined":
                results[version]["current"] = score(runs, settings.FAQ_STRONG_MATCH, settings.FAQ_POSSIBLE_MATCH)
            if version == "keywords":
                results[version]["current"] = score(runs, settings.FAQ_KEYWORD_STRONG_MATCH, settings.FAQ_KEYWORD_POSSIBLE_MATCH)
        rows = [
            "| Version | Strong / possible | Top-1 | Top-3 | Answered right | Helped | Wrong answers | Off-topic refused | ms |",
            "|---|---|---|---|---|---|---|---|---|",
        ]
        self.stdout.write(f"Rule: most answered right with at most {MAX_WRONG} wrong answers and {MIN_OFF_TOPIC_REFUSED}% of off-topic questions refused.")
        for version, found in results.items():
            for label, result in found.items():
                if result is None:
                    continue
                rows.append(
                    f"| {version} ({label}) | {result['strong']:.2f} / {result['possible']:.2f} | {result['top1']}% | {result['top3']}% | "
                    f"{result['answeredRight']}% | {result['helped']}% | {result['wrongAnswers']} | {result['offTopicRefused']}% | {result['milliseconds']} |"
                )
        self.stdout.write("\n".join(rows))
        if "combined" in results:
            self.stdout.write("\nCombined, by kind of question (the rule's cut-offs):")
            for kind, values in results["combined"]["rule"]["byKind"].items():
                self.stdout.write(f"  {kind}: {values['questions']} questions, answered right {values['answeredPercent']}%, helped {values['helpedPercent']}%")
        if options["out"]:
            payload = {
                "date": date.today().isoformat(),
                "model": settings.FAQ_MODEL if encoder is not None else "",
                "questions": len(items),
                "leftOut": missing,
                "results": results,
            }
            Path(options["out"]).write_text(json.dumps(payload, indent=2), encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Wrote {options['out']}"))
