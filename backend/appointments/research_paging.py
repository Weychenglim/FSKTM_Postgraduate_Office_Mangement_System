"""Opt-in Coordinator research browsing, filtered and sliced before serialization."""
import re
from math import ceil

from django.db.models import Case, CharField, F, OuterRef, Q, Subquery, Value, When
from django.db.models.fields.json import KeyTextTransform
from django.db.models.functions import Coalesce, Concat
from rest_framework import serializers

from academics.models import AcademicSemester
from accounts.authorization import coordinator_scope_q
from accounts.models import Student, User
from . import research_amendments as service
from .models import ResearchAmendment, ResearchAmendmentEvent


class BrowseInput(serializers.Serializer):
    page = serializers.IntegerField(min_value=1, default=1)
    size = serializers.ChoiceField(choices=[10, 25, 50], default=10)
    view = serializers.ChoiceField(choices=['requests', 'history'], default='requests')
    focus = serializers.ChoiceField(choices=['decision', 'all'], default='decision')
    sort = serializers.ChoiceField(choices=['waiting', 'oldest', 'newest'], required=False)
    q = serializers.CharField(required=False, allow_blank=True, default='')
    programme = serializers.CharField(required=False, allow_blank=True, default='')
    semester = serializers.CharField(required=False, allow_blank=True, default='')
    type = serializers.CharField(required=False, allow_blank=True, default='all')
    status = serializers.ChoiceField(choices=ResearchAmendment.Status.values, allow_blank=True, default='')
    # Rename these reserved Python words after parsing.
    from_date = serializers.DateField(required=False, input_formats=['%Y-%m-%d'])
    to_date = serializers.DateField(required=False, input_formats=['%Y-%m-%d'])

    def validate_type(self, value):
        choices = {'all': 'all', 'research': 'RESEARCH', 'research change': 'RESEARCH', 'research amendment': 'RESEARCH',
                   'transfer': 'TRANSFER', 'programme transfer': 'TRANSFER', 'title change': 'Title change',
                   'abstract change': 'Abstract change', 'title and abstract change': 'Title and abstract change'}
        if value.strip().lower() not in choices:
            raise serializers.ValidationError('Unsupported request type.')
        return choices[value.strip().lower()]

    def validate(self, data):
        if data.get('from_date') and data.get('to_date') and data['from_date'] > data['to_date']:
            raise serializers.ValidationError('The start date must be before the end date.')
        return data


def decision_scope(actor):
    if actor.role != User.Role.COORDINATOR:
        return Q(pk__in=[])
    return Q(kind='TRANSFER', student__status=Student.Status.ACTIVE, student__user__is_active=True) & (
        (Q(status='PENDING_SOURCE_COORDINATOR') & coordinator_scope_q(actor, 'source_programme')) |
        (Q(status='PENDING_DESTINATION_COORDINATOR') & coordinator_scope_q(actor, 'destination_programme')))


def _annotations(rows):
    title_changed = ~Q(before_values__title=F('after_values__title'))
    abstract_changed = ~Q(before_values__abstract=F('after_values__abstract'))
    term_label = Case(*(When(academic_semester__term=value, then=Value(label))
                        for value, label in AcademicSemester.Term.choices), output_field=CharField())
    semester_label = Case(When(academic_semester__isnull=True, then=F('profile__semester')),
        default=Concat(term_label, Value(' '), F('academic_semester__academic_session')), output_field=CharField())
    stage = ResearchAmendmentEvent.objects.filter(request_id=OuterRef('pk'), new_status=OuterRef('status')).exclude(
        previous_status=F('new_status')).order_by('-created_at', '-pk').values('created_at')[:1]
    return rows.annotate(
        changeLabel=Case(When(kind='TRANSFER', then=Value('Programme transfer')),
            When(title_changed & abstract_changed, then=Value('Title and abstract change')),
            When(title_changed, then=Value('Title change')), When(abstract_changed, then=Value('Abstract change')),
            default=Value('Research change'), output_field=CharField()),
        semesterLabel=Coalesce(KeyTextTransform('label', 'semester_snapshot'), semester_label, output_field=CharField()),
        stageAt=Coalesce(Subquery(stage), F('created_at')),
    )


def collection_page(rows, actor, params):
    values = params.dict()
    for public, internal in (('from', 'from_date'), ('to', 'to_date')):
        if values.get(public):
            values[internal] = values[public]
    serializer = BrowseInput(data=values)
    serializer.is_valid(raise_exception=True)
    opts = serializer.validated_data
    if service.office(actor):
        opts["focus"] = "all"
    permitted_decisions = decision_scope(actor)
    review_count = rows.filter(permitted_decisions).count()
    rows = _annotations(rows)
    rows = rows.exclude(status__in=ResearchAmendment.PENDING_STATUSES) if opts['view'] == 'history' else rows.filter(status__in=ResearchAmendment.PENDING_STATUSES)
    facets = {
        'programmes': sorted(set(filter(None, rows.order_by().values_list('source_programme', flat=True).distinct())) |
                             set(filter(None, rows.order_by().values_list('destination_programme', flat=True).distinct())), key=str.casefold),
        'semesters': sorted(filter(None, rows.order_by().values_list('semesterLabel', flat=True).distinct())),
        'statuses': sorted(rows.order_by().values_list('status', flat=True).distinct()),
    }
    if opts['view'] == 'requests' and opts['focus'] == 'decision':
        rows = rows.filter(permitted_decisions)
    if opts['q']:
        query = opts['q']
        search = Q(student_name__icontains=query) | Q(matric_no__icontains=query) | Q(after_values__title__icontains=query) | Q(changeLabel__icontains=query)
        reference = re.fullmatch(r'(?:(?:research\s+)?(?:request|amendment)\s*#?\s*)?#?(\d+)', query, re.IGNORECASE)
        if reference:
            search |= Q(pk=int(reference.group(1)))
        rows = rows.filter(search)
    if opts['programme']:
        rows = rows.filter(Q(source_programme__trim__iexact=opts['programme']) | Q(destination_programme__trim__iexact=opts['programme']))
    if opts['semester']:
        rows = rows.filter(semesterLabel=opts['semester'])
    if opts['type'] in ('RESEARCH', 'TRANSFER'):
        rows = rows.filter(kind=opts['type'])
    elif opts['type'] != 'all':
        rows = rows.filter(changeLabel=opts['type'])
    if opts['status']:
        rows = rows.filter(status=opts['status'])
    date_field = 'updated_at' if opts['view'] == 'history' else 'created_at'
    for key, lookup in (('from_date', 'gte'), ('to_date', 'lte')):
        if opts.get(key):
            rows = rows.filter(**{f'{date_field}__date__{lookup}': opts[key]})
    sort = opts.get('sort', 'newest' if opts['view'] == 'history' else 'waiting')
    sort_field = 'stageAt' if sort == 'waiting' and opts['view'] == 'requests' else date_field
    descending = sort == 'newest' or sort == 'waiting' and opts['view'] == 'history'
    rows = rows.order_by(f'-{sort_field}' if descending else sort_field, '-pk' if descending else 'pk')
    total = rows.count()
    page_count = max(1, ceil(total / opts['size']))
    page = min(opts['page'], page_count)
    start = (page - 1) * opts['size']
    results = []
    for row in rows[start:start + opts['size']]:
        payload = service.request_payload(row, actor)
        payload['canDecide'] = payload['canDecide'] and row.student.user.is_active
        results.append(payload)
    return {'requests': results, 'revisions': [], 'pagination': {'total': total, 'page': page, 'pageSize': opts['size'],
            'pageCount': page_count, 'reviewCount': review_count, 'facets': facets}}
