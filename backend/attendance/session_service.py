"""
Session-based attendance logic.

Implements the Triple G BuildHub attendance policy:
- Morning:   8:00 AM baseline, late after 8:05 AM, available 5:00 AM - 12:00 PM
- Afternoon: 1:00 PM baseline, late after 1:05 PM, available 12:40 PM - 5:00 PM
- Overtime:  7:00 PM baseline, late after 7:05 PM, available 6:50 PM - 10:00 PM

Hours are calculated from baseline times, not actual check-in times.
"""
from datetime import time, datetime, timedelta
from decimal import Decimal

# Session windows: (start, end)
SESSION_WINDOWS = {
    'morning':   (time(5, 0), time(12, 0)),
    'afternoon': (time(12, 40), time(17, 0)),
    'overtime':  (time(18, 50), time(22, 0)),
}

# Baseline start times (official start)
SESSION_BASELINES = {
    'morning':   time(8, 0),
    'afternoon': time(13, 0),
    'overtime':  time(19, 0),
}

# Late thresholds (baseline + 5 minutes)
LATE_THRESHOLDS = {
    'morning':   time(8, 5),
    'afternoon': time(13, 5),
    'overtime':  time(19, 5),
}

# Maximum hours per session
SESSION_MAX_HOURS = {
    'morning':   Decimal('4'),
    'afternoon': Decimal('4'),
    'overtime':  Decimal('3'),
}

# Session end baselines (for hours calculation)
SESSION_END_BASELINES = {
    'morning':   time(12, 0),
    'afternoon': time(17, 0),
    'overtime':  time(22, 0),
}


def determine_session(current_time):
    """
    Determine which session a check-in time falls into.
    Returns 'morning', 'afternoon', 'overtime', or None if outside all windows.
    """
    if isinstance(current_time, datetime):
        current_time = current_time.time()

    for session_name, (start, end) in SESSION_WINDOWS.items():
        if start <= current_time <= end:
            return session_name

    return None


def is_late_for_session(session_type, check_in_time):
    """Check if a check-in time is late for the given session."""
    if session_type not in LATE_THRESHOLDS:
        return False

    if isinstance(check_in_time, datetime):
        check_in_time = check_in_time.time()

    return check_in_time > LATE_THRESHOLDS[session_type]


def calculate_late_deduction(session_type, check_in_time):
    """
    Calculate late deduction. Late minutes only start counting AFTER the 5-minute grace period.

    Policy:
    - If clock-in is within the 5-minute grace period (baseline to baseline+5 mins): 0h deduction.
    - If clock-in is past the grace period: (actual minutes late - 5 mins) converted to hours.
    
    Examples (morning baseline 8:00 AM, grace period ends 8:05 AM):
      - 8:03 AM → not late → 0h
      - 8:05 AM → not late → 0h
      - 8:06 AM → late (1 min counted) → 0.02h
      - 8:10 AM → late (5 mins counted) → 0.08h
      - 9:00 AM → late (55 mins counted) → 0.92h
    """
    if not is_late_for_session(session_type, check_in_time):
        return Decimal('0')

    if isinstance(check_in_time, datetime):
        check_in_time = check_in_time.time()

    baseline = SESSION_BASELINES[session_type]
    max_hours = SESSION_MAX_HOURS[session_type]

    # Total minutes from baseline
    total_minutes_late = (check_in_time.hour * 60 + check_in_time.minute) - (baseline.hour * 60 + baseline.minute)
    
    # We subtract 5 minutes as the policy states lates only "start counting after" the baseline 5 mins.
    # If someone checks in at 8:06, they are 6 mins past baseline, but only 1 min is counted.
    counted_late_minutes = max(0, total_minutes_late - 5)

    if counted_late_minutes <= 0:
        return Decimal('0')

    # Convert counted minutes to hours
    deduction = Decimal(str(round(counted_late_minutes / 60, 2)))
    return min(deduction, max_hours)


def calculate_session_hours(session_type, check_out_time):
    """
    Calculate credited hours for a session based on baseline times.
    Hours = min(checkout_time, session_end) - baseline_start, capped at max hours.
    """
    if session_type not in SESSION_BASELINES:
        return Decimal('0')

    if isinstance(check_out_time, datetime):
        check_out_time = check_out_time.time()

    baseline_start = SESSION_BASELINES[session_type]
    session_end = SESSION_END_BASELINES[session_type]
    max_hours = SESSION_MAX_HOURS[session_type]

    # If checked out before baseline start, 0 hours
    if check_out_time <= baseline_start:
        return Decimal('0')

    # Cap checkout at session end
    effective_end = min(check_out_time, session_end)

    # Calculate minutes from baseline
    start_minutes = baseline_start.hour * 60 + baseline_start.minute
    end_minutes = effective_end.hour * 60 + effective_end.minute
    diff_minutes = end_minutes - start_minutes

    if diff_minutes <= 0:
        return Decimal('0')

    hours = Decimal(str(round(diff_minutes / 60, 2)))
    return min(hours, max_hours)


def get_net_session_hours(session_type, check_in_time, check_out_time):
    """
    Calculate net hours for a session: gross hours minus late deduction.
    """
    gross = calculate_session_hours(session_type, check_out_time)
    deduction = calculate_late_deduction(session_type, check_in_time)
    net = gross - deduction
    return max(net, Decimal('0'))
