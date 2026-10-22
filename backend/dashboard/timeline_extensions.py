"""Office-only informational event extensions from the shared timeline hub."""
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academics.models import AcademicSemester
from .models import SemesterTimelineEntry, TimelineAuditLog
from .serializers import TimelineEntrySerializer


class ExtensionInput(serializers.Serializer):
    deadlineEnd = serializers.DateField()
    expectedDeadlineEnd = serializers.DateField(required=False)
    reason = serializers.CharField(max_length=2000, allow_blank=False, trim_whitespace=True)

    def to_internal_value(self, data):
        if set(data) - set(self.fields):
            raise serializers.ValidationError('Unexpected extension fields.')
        return super().to_internal_value(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def extend_timeline_entry_view(request, pk):
    if request.user.role != request.user.Role.OFFICE_ADMIN:
        return Response({'error': 'Only Office Staff/Admin can extend timeline events.'}, status=403)
    data = ExtensionInput(data=request.data)
    data.is_valid(raise_exception=True)
    entry = SemesterTimelineEntry.objects.select_related('timeline__academic_semester').filter(pk=pk).first()
    if entry is None:
        return Response({'error': 'Timeline event was not found.'}, status=404)
    semester_id = entry.timeline.academic_semester_id
    semester = AcademicSemester.objects.select_for_update().filter(pk=semester_id).first()
    entry = SemesterTimelineEntry.objects.select_for_update().select_related('timeline').filter(pk=pk).first()
    if entry is None:
        return Response({'error': 'Timeline event was removed. Reload the timeline.'}, status=404)
    if not semester or semester.lifecycle_status not in ('DRAFT', 'ACTIVE') or not entry.timeline.is_active:
        return Response({'error': 'This timeline is no longer editable.'}, status=409)
    if entry.operational_period_id or entry.marks_period_id:
        return Response({'error': 'Extend the linked period through its shared period controls.'}, status=409)
    values = data.validated_data
    if 'expectedDeadlineEnd' in values and values['expectedDeadlineEnd'] != entry.deadline_end:
        return Response({'error': 'The deadline changed. Reload and review it again.'}, status=409)
    deadline = values['deadlineEnd']
    if deadline <= entry.deadline_end or deadline < timezone.localdate():
        return Response({'error': 'The new deadline must extend the current date and cannot be in the past.'}, status=400)
    if deadline > semester.ends_on:
        return Response({'error': 'The event deadline must fall within the selected semester.'}, status=400)
    before = {'deadlineStart': entry.deadline_start.isoformat(), 'deadlineEnd': entry.deadline_end.isoformat()}
    entry.deadline_end = deadline
    entry.save(update_fields=['deadline_end', 'updated_at'])
    TimelineAuditLog.objects.create(actor=request.user, timeline=entry.timeline, entry=entry,
        action='EXTEND', summary=f'Extended event: {entry.title or entry.detail}'[:500],
        reason=values['reason'], before_values=before,
        after_values={'deadlineStart': entry.deadline_start.isoformat(), 'deadlineEnd': deadline.isoformat()})
    return Response(TimelineEntrySerializer(entry).data)
