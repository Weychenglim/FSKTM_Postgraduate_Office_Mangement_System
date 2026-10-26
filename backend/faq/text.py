"""Words for the keyword search, in English and Malay."""
import re
import unicodedata

MAX_QUESTION = 300

STOP_WORDS = frozenset(
    """
    a about after all also am an and any are as at be been before but by can could did do does
    doing for from get got had has have how i if in into is it its just me might more most my
    no not of on or our please should so some than that the their them then there these they
    this those to too up us very was we were what when where which who why will with would you
    your yours
    ada adakah akan aku anda apa apakah atau bagaimana bila boleh dan dari dengan di ia ialah
    ini itu jika ka kah kalau ke kenapa ko la lah macam mana mahu nak pada saya sebab tak
    tidak untuk yang ya
    """.split()
)


def clean_question(text):
    """Spacing tidied and the length capped, as the question is stored."""
    return " ".join(str(text or "").split())[:MAX_QUESTION]


def _stem(word):
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 3 and word.endswith("s") and not word.endswith(("ss", "is", "us")):
        return word[:-1]
    return word


def words(text):
    """Lower-case content words, with plurals folded: "fees" matches "fee"."""
    text = unicodedata.normalize("NFKC", str(text or "")).casefold().replace("’", "'")
    return [_stem(word) for word in re.findall(r"[a-z0-9]+", text) if word not in STOP_WORDS]
