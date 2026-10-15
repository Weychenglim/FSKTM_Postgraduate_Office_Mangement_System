"""Make the appointment letter when a supervisor or panel appointment is approved.

The appointment code is not changed: approving creates an active appointment,
and the letter is made once that approval is saved for good. A letter that
cannot be made never undoes the approval.
"""
from functools import partial

from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from appointments.models import PanelAppointment, SupervisorAppointment

from .appointment_letters import make_letter_after_approval


def _after_approval(model, instance, created, raw):
    if created and not raw and instance.status == model.Status.ACTIVE:
        transaction.on_commit(partial(make_letter_after_approval, model, instance.pk), robust=True)


@receiver(post_save, sender=SupervisorAppointment, dispatch_uid="letters-supervisor-appointment-letter")
def supervisor_appointment_saved(sender, instance, created, raw=False, **kwargs):
    _after_approval(SupervisorAppointment, instance, created, raw)


@receiver(post_save, sender=PanelAppointment, dispatch_uid="letters-panel-appointment-letter")
def panel_appointment_saved(sender, instance, created, raw=False, **kwargs):
    _after_approval(PanelAppointment, instance, created, raw)
