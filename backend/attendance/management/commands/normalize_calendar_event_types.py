from django.core.management.base import BaseCommand
from django.db import transaction

from attendance.models import CalendarEvent


EVENT_TYPE_ALIASES = {
    'event': 'event',
    'working_day': 'event',
    'working day': 'event',
    'special_working_day': 'event',
    'special working day': 'event',
    'usual_day': 'event',
    'usual day': 'event',
    'holiday': 'holiday',
    'holidays': 'holiday',
    'downtime': 'downtime',
    'no_work_day': 'downtime',
    'no work day': 'downtime',
    'non_working_day': 'downtime',
    'non working day': 'downtime',
    'non-working day': 'downtime',
}


class Command(BaseCommand):
    help = 'Normalize CalendarEvent.event_type values to canonical types (event, holiday, downtime).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Apply updates. Without this flag, the command runs in dry-run mode.',
        )

    def _canonical_event_type(self, event):
        raw = str(event.event_type or '').strip().lower()
        if raw in EVENT_TYPE_ALIASES:
            return EVENT_TYPE_ALIASES[raw]

        if event.is_holiday:
            return 'holiday'

        return 'event'

    def handle(self, *args, **options):
        apply_changes = options['apply']
        events = list(CalendarEvent.objects.all().order_by('date', 'title', 'id'))

        total = len(events)
        changes = []

        for event in events:
            canonical = self._canonical_event_type(event)
            if canonical != event.event_type:
                changes.append((event, event.event_type, canonical))

        self.stdout.write(self.style.NOTICE(f'Total events checked: {total}'))
        self.stdout.write(self.style.NOTICE(f'Events needing normalization: {len(changes)}'))

        if not changes:
            self.stdout.write(self.style.SUCCESS('No event_type updates needed.'))
            return

        for event, old_value, new_value in changes[:50]:
            self.stdout.write(
                f'- id={event.id} date={event.date} title="{event.title}" event_type: "{old_value}" -> "{new_value}"'
            )

        if len(changes) > 50:
            self.stdout.write(self.style.WARNING(f'...and {len(changes) - 50} more rows.'))

        if not apply_changes:
            self.stdout.write(self.style.WARNING('Dry-run only. Re-run with --apply to persist changes.'))
            return

        with transaction.atomic():
            for event, _old_value, new_value in changes:
                event.event_type = new_value
                event.save(update_fields=['event_type', 'updated_at'])

        self.stdout.write(self.style.SUCCESS(f'Updated {len(changes)} event(s).'))
