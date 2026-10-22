"""User-approved, append-only local demo setup. Run through Django manage.py shell."""
import json
from datetime import date
from django.db import transaction
from accounts.models import User
from academics.models import AcademicSemester, OperationalPeriod, OperationalEnforcement
from dashboard.models import SemesterTimeline, SemesterTimelineEntry
from dashboard.views import timeline_entry_list_view
from rest_framework.test import APIRequestFactory, force_authenticate

with transaction.atomic():
    semester = AcademicSemester.objects.select_for_update().get(pk=1, code='2026-2027-S1', lifecycle_status='ACTIVE')
    actor = User.objects.get(pk=1, full_name='Demo Office Administrator', role=User.Role.OFFICE_ADMIN, is_active=True)
    timeline = SemesterTimeline.objects.get(pk=12, academic_semester=semester, is_active=True)
    before = list(timeline.entries.order_by('pk').values())
    period_count = OperationalPeriod.objects.filter(academic_semester=semester).count()
    rules = list(OperationalEnforcement.objects.filter(academic_semester=semester).order_by('pk').values())
    results = []
    for title, start, end in [
        ('Demo: Supervisor application window', date(2026, 10, 22), date(2026, 10, 29)),
        ('Demo: Panel recommendation window', date(2026, 11, 2), date(2026, 11, 9)),
    ]:
        assert semester.starts_on <= start <= end <= semester.ends_on
        existing = timeline.entries.filter(title=title).first()
        if existing:
            results.append(dict(id=existing.pk, title=title, created=False))
            continue
        payload = dict(semesterId=semester.pk, level='P1', title=title,
            detail='Demonstration event for the submission-window timeline picker. Link it explicitly; its dates will then follow the submission window.',
            action='Students / Lecturers / Office staff', deadlineStart=start.isoformat(), deadlineEnd=end.isoformat(),
            targetRoles=['STUDENT', 'LECTURER', 'OFFICE_STAFF'])
        request = APIRequestFactory().post('/api/dashboard/timeline/entries/', payload, format='json')
        force_authenticate(request, user=actor)
        response = timeline_entry_list_view(request)
        if response.status_code != 201:
            raise RuntimeError(f'Demo event creation failed: {response.status_code} {response.data}')
        results.append(dict(id=response.data['id'], title=title, created=True))
    original_ids = [row['id'] for row in before]
    assert before == list(SemesterTimelineEntry.objects.filter(pk__in=original_ids).order_by('pk').values())
    assert OperationalPeriod.objects.filter(academic_semester=semester).count() == period_count
    assert list(OperationalEnforcement.objects.filter(academic_semester=semester).order_by('pk').values()) == rules
    result = dict(semesterId=semester.pk, timelineId=timeline.pk, existingEventsPreserved=len(before),
                  totalEvents=timeline.entries.count(), events=results, submissionWindowsUnchanged=True, dateRestrictionsUnchanged=True)
print(json.dumps(result))
