"""Bounded browsing of the actor's existing current-profile scope."""
from math import ceil

from django.db.models import Q
from django.db.models.functions import Lower
from rest_framework import serializers

from . import research_amendments as service


class ProfileBrowseInput(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    size = serializers.ChoiceField(choices=[10, 25, 50], default=10)
    q = serializers.CharField(max_length=500, required=False, allow_blank=True, default='')
    programme = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    sort = serializers.ChoiceField(choices=['name', 'name_desc', 'updated'], default='name')


def profile_page(actor, params):
    serializer = ProfileBrowseInput(data=params)
    serializer.is_valid(raise_exception=True)
    opts = serializer.validated_data
    rows = service.current_profiles(actor)
    programmes = sorted(filter(None, rows.order_by().values_list('student__student__programme', flat=True).distinct()), key=str.casefold)
    if opts['q']:
        query = opts['q']
        rows = rows.filter(Q(student__full_name__icontains=query) | Q(student__student__matric_no__icontains=query) | Q(proposed_topic__icontains=query))
    if opts['programme']:
        rows = rows.filter(student__student__programme=opts['programme'])
    if opts['sort'] == 'updated':
        rows = rows.order_by('-updated_at', 'pk')
    else:
        name = Lower('student__full_name')
        rows = rows.order_by(name.desc() if opts['sort'] == 'name_desc' else name.asc(), 'pk')
    total = rows.count()
    page_count = max(1, ceil(total / opts['size']))
    page = min(opts['page'], page_count)
    start = (page - 1) * opts['size']
    students = [{'id': row.student_id, 'name': row.student.full_name, 'matricNo': row.student.student.matric_no,
                 'programme': row.student.student.programme, 'title': row.proposed_topic} for row in rows[start:start + opts['size']]]
    return {'students': students, 'programmes': programmes,
            'pagination': {'total': total, 'page': page, 'pageSize': opts['size'], 'pageCount': page_count}}
