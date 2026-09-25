from django.db import migrations, models


def backfill_confirmed_research_profiles(apps, _schema_editor):
    StudentResearchProfile = apps.get_model(
        "appointments", "StudentResearchProfile"
    )
    SupervisorAppointment = apps.get_model(
        "appointments", "SupervisorAppointment"
    )

    appointments = SupervisorAppointment.objects.filter(
        application__status="APPROVED"
    ).select_related(
        "application",
        "application__academic_semester",
        "student",
        "student__user",
    )
    for appointment in appointments.iterator():
        application = appointment.application
        student = appointment.student
        student_user = student.user
        by_student = StudentResearchProfile.objects.filter(
            student_id=student_user.pk
        ).first()
        by_matric = StudentResearchProfile.objects.filter(
            matric_no=student.matric_no
        ).first()
        if by_student and by_matric and by_student.pk != by_matric.pk:
            continue

        semester = application.academic_semester
        semester_label = (
            f"{semester.get_term_display()} {semester.academic_session}"
            if semester
            else "Legacy / Unassigned"
        )
        values = {
            "student_id": student_user.pk,
            "matric_no": student.matric_no,
            "student_name": student_user.full_name,
            "programme": student.programme,
            "semester": semester_label,
            "proposed_topic": application.research_title,
            "research_area": application.research_area,
            "abstract": application.research_abstract,
            "supervisor_id": appointment.supervisor_id,
        }
        profile = by_student or by_matric
        if profile is None:
            StudentResearchProfile.objects.create(**values)
            continue

        update_fields = []
        if profile.student_id is None:
            profile.student_id = student_user.pk
            update_fields.append("student")
        for field in (
            "student_name",
            "programme",
            "semester",
            "proposed_topic",
            "research_area",
            "abstract",
        ):
            if not getattr(profile, field):
                setattr(profile, field, values[field])
                update_fields.append(field)
        if update_fields:
            profile.save(update_fields=update_fields)


class Migration(migrations.Migration):
    dependencies = [
        ("appointments", "0008_supervisorapplicationdocument_checksum_sha256_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="supervisorapplication",
            name="research_area",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.RunPython(
            backfill_confirmed_research_profiles,
            migrations.RunPython.noop,
        ),
    ]
