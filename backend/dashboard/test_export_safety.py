from io import BytesIO

from django.test import SimpleTestCase
from openpyxl import load_workbook

from dashboard.reports import build_workflow_report_workbook


class WorkflowExportSafetyTests(SimpleTestCase):
    def test_untrusted_text_is_literal_after_workbook_round_trip(self):
        for text in ('=1+1', '+SUM(1,2)', '-1+2', '@SUM(A1)', '\t=1+1', '  =1+1', '#N/A'):
            with self.subTest(text=text):
                record = {
                    'recordId': 12,
                    'studentName': text,
                    'researchTitle': text,
                    'programme': text,
                    'sourceProgramme': text,
                    'destinationProgramme': text,
                    'title': text,
                    'targetRoles': [text],
                    'waitingDays': -3,
                    'daysUntilDue': -2.5,
                }
                report = {
                    'generatedAt': '2026-09-30T00:00:00Z',
                    'scope': {'role': 'OFFICE_ADMIN', 'programmes': [text]},
                    'filters': {
                        'programme': None, 'startDate': None,
                        'endDate': None, 'semester': text,
                    },
                    'overview': {'totalRecords': 12, 'averageWaitingDays': 2.5},
                    **{section: {'records': [record]} for section in (
                        'researchAmendments', 'supervisor', 'panel', 'marks', 'timeline',
                    )},
                }
                workbook = load_workbook(BytesIO(build_workflow_report_workbook(report)))
                for sheet_name, addresses in {
                    'Summary': ('B3', 'B6'),
                    'Research Amendments': ('C2', 'F2', 'G2'),
                    'Supervisor': ('F2', 'G2', 'H2'),
                    'Panel': ('F2', 'G2', 'H2'),
                    'Marks': ('F2', 'G2'),
                    'Timeline': ('E2', 'H2'),
                }.items():
                    for address in addresses:
                        cell = workbook[sheet_name][address]
                        self.assertEqual(cell.value, text)
                        self.assertEqual(cell.data_type, 's', f'{sheet_name}!{address}')
                for sheet_name, address, expected in (
                    ('Summary', 'B7', 12), ('Summary', 'B8', 2.5),
                    ('Supervisor', 'N2', -3), ('Marks', 'M2', -2.5),
                ):
                    cell = workbook[sheet_name][address]
                    self.assertEqual(cell.value, expected)
                    self.assertEqual(cell.data_type, 'n')
