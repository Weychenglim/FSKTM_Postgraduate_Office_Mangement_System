from django.db import migrations

# The built-in recipient lists as they were on 2026-10-25, now kept by the office.
PURPOSES = [
    ("BANKING", "Banking", "Perbankan", "Bank"),
    ("GOVERNMENT", "Government agencies", "Agensi kerajaan", "Agency"),
    ("MOBILITY", "Mobility (exchange programme)", "Mobiliti (program pertukaran)", "Host university or organiser"),
    ("NGO", "Non-government agencies", "Badan bukan kerajaan", "Organisation"),
    ("SPONSORSHIP", "Sponsorship", "Penajaan", "Sponsor"),
    ("TRANSPORTATION", "Transportation", "Pengangkutan", "Company"),
]

ORGANISATIONS = {
    "BANKING": [
        "Affin Bank Berhad", "Affin Islamic Bank Berhad", "AEON Bank (M) Berhad",
        "Agrobank (Bank Pertanian Malaysia Berhad)", "Al Rajhi Banking & Investment Corporation (Malaysia) Berhad",
        "Alliance Bank Malaysia Berhad", "Alliance Islamic Bank Berhad", "AmBank (M) Berhad", "AmBank Islamic Berhad",
        "Bangkok Bank Berhad", "Bank Islam Malaysia Berhad", "Bank Kerjasama Rakyat Malaysia Berhad (Bank Rakyat)",
        "Bank Muamalat Malaysia Berhad", "Bank of America Malaysia Berhad", "Bank of China (Malaysia) Berhad",
        "Bank Simpanan Nasional (BSN)", "BNP Paribas Malaysia Berhad", "Boost Bank Berhad", "CIMB Bank Berhad",
        "CIMB Islamic Bank Berhad", "Citibank Berhad", "Deutsche Bank (Malaysia) Berhad", "GX Bank Berhad",
        "Hong Leong Bank Berhad", "Hong Leong Islamic Bank Berhad", "HSBC Amanah Malaysia Berhad",
        "HSBC Bank Malaysia Berhad", "Industrial and Commercial Bank of China (Malaysia) Berhad",
        "J.P. Morgan Chase Bank Berhad", "KAF Digital Bank Berhad", "Kuwait Finance House (Malaysia) Berhad",
        "Malayan Banking Berhad (Maybank)", "Maybank Islamic Berhad", "MBSB Bank Berhad",
        "Mizuho Bank (Malaysia) Berhad", "MUFG Bank (Malaysia) Berhad", "OCBC Al-Amin Bank Berhad",
        "OCBC Bank (Malaysia) Berhad", "Public Bank Berhad", "Public Islamic Bank Berhad", "RHB Bank Berhad",
        "RHB Islamic Bank Berhad", "Ryt Bank Berhad", "Standard Chartered Bank Malaysia Berhad",
        "Standard Chartered Saadiq Berhad", "Sumitomo Mitsui Banking Corporation Malaysia Berhad",
        "United Overseas Bank (Malaysia) Bhd",
    ],
    "GOVERNMENT": [
        "Bahagian Kemasukan Pelajar IPTA, Kementerian Pendidikan Tinggi Malaysia",
        "Bahagian Perancangan dan Penyelidikan Dasar Pendidikan", "Education Malaysia Global Services (EMGS)",
        "Jabatan Imigresen Malaysia", "Jabatan Kebajikan Masyarakat", "Jabatan Pendaftaran Negara (JPN)",
        "Jabatan Pengangkutan Jalan (JPJ)", "Jabatan Perkhidmatan Awam (JPA)", "Jabatan Tenaga Kerja",
        "Kementerian Kesihatan Malaysia", "Kementerian Luar Negeri (Wisma Putra)", "Kementerian Pendidikan Malaysia",
        "Kementerian Pendidikan Tinggi Malaysia", "Kumpulan Wang Simpanan Pekerja (KWSP)",
        "Lembaga Hasil Dalam Negeri Malaysia (LHDN)", "Majlis Amanah Rakyat (MARA)",
        "Pertubuhan Keselamatan Sosial (PERKESO)", "Polis Diraja Malaysia (PDRM)", "Australian High Commission",
        "British High Commission", "Embassy of the People's Republic of China", "Embassy of the Republic of Indonesia",
        "Embassy of Japan", "Embassy of the Republic of Korea", "Embassy of the United States of America",
        "High Commission of Bangladesh", "High Commission of India", "High Commission of Pakistan",
        "High Commission of the Republic of Singapore",
    ],
    "MOBILITY": [],
    "NGO": ["Malaysian Red Crescent Society", "MERCY Malaysia", "Majlis Belia Malaysia", "WWF-Malaysia"],
    "SPONSORSHIP": [
        "Bank Negara Malaysia", "Jabatan Perkhidmatan Awam (JPA)", "Kementerian Pendidikan Tinggi Malaysia",
        "Lembaga Zakat Selangor", "Majlis Amanah Rakyat (MARA)", "Perbadanan Tabung Pendidikan Tinggi Nasional (PTPTN)",
        "Yayasan Hasanah", "Yayasan Khazanah", "Yayasan Petronas", "Yayasan Sime Darby", "Yayasan Telekom Malaysia",
    ],
    "TRANSPORTATION": [
        "AirAsia Berhad", "AirAsia X Berhad", "Batik Air Malaysia", "Express Rail Link Sdn Bhd (KLIA Ekspres)",
        "Firefly Sdn Bhd", "Keretapi Tanah Melayu Berhad (KTMB)", "Malaysia Airlines Berhad", "MASwings Sdn Bhd",
        "Mass Rapid Transit Corporation Sdn Bhd (MRT Corp)", "Prasarana Malaysia Berhad (Rapid KL)",
    ],
}


def seed(apps, schema_editor):
    ChoiceList = apps.get_model("letters", "ChoiceList")
    ChoiceGroup = apps.get_model("letters", "ChoiceGroup")
    ChoiceItem = apps.get_model("letters", "ChoiceItem")
    LetterTemplate = apps.get_model("letters", "LetterTemplate")
    GeneratedLetter = apps.get_model("letters", "GeneratedLetter")

    recipients, _ = ChoiceList.objects.get_or_create(
        kind="RECIPIENTS",
        defaults={"name": "Recipients", "description": "Who a letter can be for, by purpose.", "modified_by": "System"},
    )
    for order, (code, name, name_ms, noun) in enumerate(PURPOSES):
        group, _ = ChoiceGroup.objects.get_or_create(
            choice_list=recipients,
            code=code,
            defaults={"name": name, "name_ms": name_ms, "item_noun": noun, "order": order, "modified_by": "System"},
        )
        for item_order, item_name in enumerate(ORGANISATIONS[code]):
            ChoiceItem.objects.get_or_create(
                choice_list=recipients, group=group, name=item_name,
                defaults={"order": item_order, "modified_by": "System"},
            )

    # The on/off switch becomes the "Who is the letter for?" question.
    for template in LetterTemplate.objects.filter(asks_recipient=True):
        if not template.form_questions:
            template.form_questions = [{"kind": "recipient", "purposes": [], "askAddress": True}, {"kind": "extras"}]
            template.save(update_fields=["form_questions"])

    # Letters already asked for keep a link to the organisation they chose.
    for letter in GeneratedLetter.objects.exclude(request_details={}):
        details = dict(letter.request_details or {})
        name = (details.get("organisation") or "").casefold()
        item = next(
            (i for i in ChoiceItem.objects.filter(group__choice_list=recipients, group__code=details.get("purpose"))
             if i.name.casefold() == name),
            None,
        )
        if item:
            letter.choice_items.add(item)
            details["organisationId"] = item.pk
            letter.request_details = details
            letter.save(update_fields=["request_details"])


class Migration(migrations.Migration):

    dependencies = [
        ("letters", "0008_choice_lists_and_form_questions"),
    ]

    operations = [
        migrations.RunPython(seed, migrations.RunPython.noop),
    ]
