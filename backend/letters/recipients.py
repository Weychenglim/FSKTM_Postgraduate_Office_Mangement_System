"""Who a student confirmation letter is for, as in Maya: the purpose, then the
organisation. The lists are built in and searched as the student types; any
organisation not listed can be typed in. Addresses are typed by the student,
since a letter usually goes to one branch or office.
"""

PURPOSES = [
    ("BANKING", "Banking", "Bank"),
    ("GOVERNMENT", "Government agencies", "Agency"),
    ("MOBILITY", "Mobility (exchange programme)", "Host university or organiser"),
    ("NGO", "Non-government agencies", "Organisation"),
    ("SPONSORSHIP", "Sponsorship", "Sponsor"),
    ("TRANSPORTATION", "Transportation", "Company"),
]

ORGANISATIONS = {
    "BANKING": [
        "Affin Bank Berhad",
        "Affin Islamic Bank Berhad",
        "AEON Bank (M) Berhad",
        "Agrobank (Bank Pertanian Malaysia Berhad)",
        "Al Rajhi Banking & Investment Corporation (Malaysia) Berhad",
        "Alliance Bank Malaysia Berhad",
        "Alliance Islamic Bank Berhad",
        "AmBank (M) Berhad",
        "AmBank Islamic Berhad",
        "Bangkok Bank Berhad",
        "Bank Islam Malaysia Berhad",
        "Bank Kerjasama Rakyat Malaysia Berhad (Bank Rakyat)",
        "Bank Muamalat Malaysia Berhad",
        "Bank of America Malaysia Berhad",
        "Bank of China (Malaysia) Berhad",
        "Bank Simpanan Nasional (BSN)",
        "BNP Paribas Malaysia Berhad",
        "Boost Bank Berhad",
        "CIMB Bank Berhad",
        "CIMB Islamic Bank Berhad",
        "Citibank Berhad",
        "Deutsche Bank (Malaysia) Berhad",
        "GX Bank Berhad",
        "Hong Leong Bank Berhad",
        "Hong Leong Islamic Bank Berhad",
        "HSBC Amanah Malaysia Berhad",
        "HSBC Bank Malaysia Berhad",
        "Industrial and Commercial Bank of China (Malaysia) Berhad",
        "J.P. Morgan Chase Bank Berhad",
        "KAF Digital Bank Berhad",
        "Kuwait Finance House (Malaysia) Berhad",
        "Malayan Banking Berhad (Maybank)",
        "Maybank Islamic Berhad",
        "MBSB Bank Berhad",
        "Mizuho Bank (Malaysia) Berhad",
        "MUFG Bank (Malaysia) Berhad",
        "OCBC Al-Amin Bank Berhad",
        "OCBC Bank (Malaysia) Berhad",
        "Public Bank Berhad",
        "Public Islamic Bank Berhad",
        "RHB Bank Berhad",
        "RHB Islamic Bank Berhad",
        "Ryt Bank Berhad",
        "Standard Chartered Bank Malaysia Berhad",
        "Standard Chartered Saadiq Berhad",
        "Sumitomo Mitsui Banking Corporation Malaysia Berhad",
        "United Overseas Bank (Malaysia) Bhd",
    ],
    "GOVERNMENT": [
        "Education Malaysia Global Services (EMGS)",
        "Jabatan Imigresen Malaysia",
        "Jabatan Kebajikan Masyarakat",
        "Jabatan Pendaftaran Negara (JPN)",
        "Jabatan Pengangkutan Jalan (JPJ)",
        "Jabatan Perkhidmatan Awam (JPA)",
        "Jabatan Tenaga Kerja",
        "Kementerian Kesihatan Malaysia",
        "Kementerian Luar Negeri (Wisma Putra)",
        "Kementerian Pendidikan Malaysia",
        "Kementerian Pendidikan Tinggi Malaysia",
        "Kumpulan Wang Simpanan Pekerja (KWSP)",
        "Lembaga Hasil Dalam Negeri Malaysia (LHDN)",
        "Majlis Amanah Rakyat (MARA)",
        "Pertubuhan Keselamatan Sosial (PERKESO)",
        "Polis Diraja Malaysia (PDRM)",
        "Australian High Commission",
        "British High Commission",
        "Embassy of the People's Republic of China",
        "Embassy of the Republic of Indonesia",
        "Embassy of Japan",
        "Embassy of the Republic of Korea",
        "Embassy of the United States of America",
        "High Commission of Bangladesh",
        "High Commission of India",
        "High Commission of Pakistan",
        "High Commission of the Republic of Singapore",
    ],
    "MOBILITY": [],
    "NGO": [
        "Malaysian Red Crescent Society",
        "MERCY Malaysia",
        "Majlis Belia Malaysia",
        "WWF-Malaysia",
    ],
    "SPONSORSHIP": [
        "Bank Negara Malaysia",
        "Jabatan Perkhidmatan Awam (JPA)",
        "Kementerian Pendidikan Tinggi Malaysia",
        "Lembaga Zakat Selangor",
        "Majlis Amanah Rakyat (MARA)",
        "Perbadanan Tabung Pendidikan Tinggi Nasional (PTPTN)",
        "Yayasan Hasanah",
        "Yayasan Khazanah",
        "Yayasan Petronas",
        "Yayasan Sime Darby",
        "Yayasan Telekom Malaysia",
    ],
    "TRANSPORTATION": [
        "AirAsia Berhad",
        "Batik Air Malaysia",
        "Express Rail Link Sdn Bhd (KLIA Ekspres)",
        "Firefly Sdn Bhd",
        "Keretapi Tanah Melayu Berhad (KTMB)",
        "Malaysia Airlines Berhad",
        "Mass Rapid Transit Corporation Sdn Bhd (MRT Corp)",
        "Prasarana Malaysia Berhad (Rapid KL)",
    ],
}

PURPOSE_CODES = [code for code, _, _ in PURPOSES]

# The extra lines a student may ask to have shown, and the tag each one fills.
OPTIONAL_DETAILS = [
    ("MIN_PERIOD", "Minimum period of study", "BALANCE_SEMESTERS_MIN"),
    ("MAX_PERIOD", "Maximum period of study", "BALANCE_SEMESTERS_MAX"),
    ("CURRENT_SEMESTER", "Current semester", "CURRENT_SEMESTER"),
]
OPTIONAL_CODES = [code for code, _, _ in OPTIONAL_DETAILS]
OPTIONAL_TAGS = {code: tag for code, _, tag in OPTIONAL_DETAILS}

ADDRESS_FIELDS = ["addressLine1", "addressLine2", "postcode", "city", "state"]
MAX_NAME = 160
MAX_ADDRESS = 120


def recipient_options():
    """The purposes, their organisations and the optional lines, for the request form."""
    return {
        "purposes": [
            {"code": code, "label": label, "organisationLabel": noun, "organisations": ORGANISATIONS[code]}
            for code, label, noun in PURPOSES
        ],
        "optionalDetails": [{"code": code, "label": label} for code, label, _ in OPTIONAL_DETAILS],
    }


def purpose_label(code):
    return next((label for key, label, _ in PURPOSES if key == code), code)


def clean_request_details(raw):
    """``(details, errors)`` for what a student entered on a confirmation letter request."""
    if not isinstance(raw, dict):
        return None, {"details": "Say who the letter is for."}
    errors = {}
    purpose = str(raw.get("purpose") or "").strip().upper()
    if purpose not in PURPOSE_CODES:
        errors["purpose"] = "Choose what the letter is for."
    organisation = " ".join(str(raw.get("organisation") or "").split())
    if not organisation:
        errors["organisation"] = "Choose or type who the letter is for."
    elif len(organisation) > MAX_NAME:
        errors["organisation"] = f"Keep the name under {MAX_NAME} characters."
    address = {}
    for field in ADDRESS_FIELDS:
        value = " ".join(str(raw.get(field) or "").split())
        if len(value) > MAX_ADDRESS:
            errors[field] = f"Keep it under {MAX_ADDRESS} characters."
        address[field] = value
    include = raw.get("include") or []
    if not isinstance(include, list) or any(code not in OPTIONAL_CODES for code in include):
        errors["include"] = "Choose from the listed details only."
        include = []
    if errors:
        return None, errors
    listed = organisation.casefold() in {name.casefold() for name in ORGANISATIONS.get(purpose, [])}
    return {
        "purpose": purpose,
        "organisation": organisation,
        "typedIn": not listed,
        **address,
        "include": [code for code in OPTIONAL_CODES if code in include],
    }, None


def recipient_block(details):
    """The name and address lines as printed at the top of the letter."""
    if not details:
        return ""
    city_line = " ".join(part for part in (details.get("postcode"), details.get("city")) if part)
    lines = [details.get("organisation"), details.get("addressLine1"), details.get("addressLine2"), city_line, details.get("state")]
    return "\n".join(line.upper() for line in lines if line)


def same_recipient(first, second):
    return bool(first and second) and (first.get("organisation") or "").casefold() == (second.get("organisation") or "").casefold()
