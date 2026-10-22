"""Synthetic research intent used by application creation tests."""

import json


def valid_research_intent(**overrides):
    return {
        "version": 1,
        "introduction": "Synthetic background and problem.",
        "aim": "Evaluate the proposed synthetic approach.",
        "researchQuestions": "How does the approach perform?",
        "researchObjectives": "Measure effectiveness on synthetic examples.",
        "significance": "Improve understanding of the approach.",
        "methodology": "Compare controlled synthetic experiments.",
        "expectedOutcomes": "A reproducible evaluation.",
        "skillsNeeded": "Research design and data analysis.",
        "timeline": "Review, experiment, analyse and report.",
        **overrides,
    }


def valid_research_intent_json():
    return json.dumps(valid_research_intent())
