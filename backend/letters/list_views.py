"""The office's lists for letter questions (see ``choice_lists.py``).

Mounted under ``/api/letters/`` by ``request_urls.py``. Only office staff
manage lists; students see list entries only through a letter's form.
"""
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import User

from . import choice_lists as lists
from .models import ChoiceGroup, ChoiceItem, ChoiceList


def _require_office(request):
    if getattr(request.user, "role", None) != User.Role.OFFICE_ADMIN:
        raise PermissionDenied("Only office staff can manage lists.")


def _actor(request):
    return getattr(request.user, "full_name", "") or getattr(request.user, "email", "Office Staff")


def _refused(problem):
    body = {"detail": str(problem)}
    if problem.field:
        body[problem.field] = str(problem)
    return Response(body, status=status.HTTP_400_BAD_REQUEST)


def _clash():
    return Response(
        {"detail": "Someone changed this list at the same time. Refresh and try again."}, status=status.HTTP_409_CONFLICT
    )


def _run(change):
    """Make a change, turning the office's mistakes into a 400 and a lost race into a 409."""
    try:
        with transaction.atomic():
            return change(), None
    except lists.ListProblem as problem:
        return None, _refused(problem)
    except IntegrityError:
        return None, _clash()


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def lists_view(request):
    """GET: every list with its counts. POST: a new simple list."""
    _require_office(request)
    if request.method == "GET":
        return Response([lists.list_summary(choice_list) for choice_list in ChoiceList.objects.all()])
    created, refused = _run(lambda: lists.create_list(request.data, _actor(request)))
    if refused:
        return refused
    return Response(lists.list_detail(created), status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def list_detail_view(request, pk):
    """One list with its purposes and entries, including hidden ones."""
    _require_office(request)
    choice_list = get_object_or_404(ChoiceList, pk=pk)
    if request.method == "GET":
        return Response(lists.list_detail(choice_list))
    if request.method == "DELETE":
        _, refused = _run(lambda: lists.delete_list(choice_list))
        return refused or Response(status=status.HTTP_204_NO_CONTENT)
    updated, refused = _run(lambda: lists.update_list(choice_list, request.data, _actor(request)))
    return refused or Response(lists.list_detail(updated))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def list_groups_view(request, pk):
    """A new purpose in the recipients list."""
    _require_office(request)
    choice_list = get_object_or_404(ChoiceList, pk=pk)
    group, refused = _run(lambda: lists.create_group(choice_list, request.data, _actor(request)))
    return refused or Response(lists.group_dict(group), status=status.HTTP_201_CREATED)


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def group_detail_view(request, pk):
    """Rename, hide or delete a purpose."""
    _require_office(request)
    group = get_object_or_404(ChoiceGroup, pk=pk)
    if request.method == "DELETE":
        _, refused = _run(lambda: lists.delete_group(group))
        return refused or Response(status=status.HTTP_204_NO_CONTENT)
    updated, refused = _run(lambda: lists.update_group(group, request.data, _actor(request)))
    return refused or Response(lists.group_dict(updated))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def list_items_view(request, pk):
    """Add one entry, or many pasted one per line (``names``)."""
    _require_office(request)
    choice_list = get_object_or_404(ChoiceList, pk=pk)
    result, refused = _run(lambda: lists.create_items(choice_list, request.data, _actor(request)))
    if refused:
        return refused
    created, skipped = result
    return Response(
        {"created": [lists.item_dict(item, used=0) for item in created], "skipped": skipped},
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def item_detail_view(request, pk):
    """Edit, hide, show or delete one entry. An entry letters used can only be hidden."""
    _require_office(request)
    item = get_object_or_404(ChoiceItem, pk=pk)
    if request.method == "DELETE":
        _, refused = _run(lambda: lists.delete_item(item))
        return refused or Response(status=status.HTTP_204_NO_CONTENT)
    updated, refused = _run(lambda: lists.update_item(item, request.data, _actor(request)))
    return refused or Response(lists.item_dict(updated, used=updated.letters.count()))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def list_order_view(request, pk):
    """Put the purposes (``groupIds``), or one purpose's entries (``groupId`` and ``itemIds``), in order."""
    _require_office(request)
    choice_list = get_object_or_404(ChoiceList, pk=pk)
    _, refused = _run(lambda: lists.reorder(choice_list, request.data))
    return refused or Response(lists.list_detail(choice_list))
