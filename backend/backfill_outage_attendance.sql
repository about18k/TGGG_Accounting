-- ============================================================================
-- BACKFILL ATTENDANCE RECORDS — System Outage June 18-19, 2026
-- ============================================================================
-- PURPOSE:  Employees could not time in/out due to a system outage on
--           Thursday June 18 and Friday June 19, 2026.
--           This script inserts the missing Attendance + TimeLog rows
--           so payroll and reports reflect a normal working day.
--
-- SESSIONS CREATED PER DAY:
--   • Morning   — time_in 08:00, time_out 12:00
--   • Afternoon — time_in 13:00, time_out 17:00
--
-- ADDRESS:
--   "Isidro Kintanar Street, Lamacan, Argao, Cebu, Central Visayas, 6021, Philippines"
--
-- TIMEOUT DOCUMENTATION NOTE:
--   "--Timeout On time"
--
-- TARGET: PostgreSQL (pgAdmin query editor)
-- ⚠️  WRAPPED IN A TRANSACTION — review verification output, then COMMIT.
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. PREVIEW — Check which active employees will receive backfilled records
--    (Optional — run this standalone first if you want to verify the list)
-- ────────────────────────────────────────────────────────────────────────────
-- SELECT id, email, first_name, last_name, role
-- FROM   accounts_customuser
-- WHERE  is_active = TRUE
-- ORDER  BY last_name, first_name;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. INSERT ATTENDANCE RECORDS
--    Creates morning + afternoon sessions for June 18 & 19 for every
--    active employee who does NOT already have a record for that
--    date + session_type combo (safe to re-run).
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO attendance_attendance (
    employee_id,
    date,
    status,
    time_in,
    time_out,
    session_type,
    is_late,
    late_deduction_hours,
    clock_in_address,
    clock_out_address,
    notes,
    work_doc_note,
    work_doc_file_paths,
    work_doc_uploaded_at,
    work_doc_uploaded_by_id,
    created_at,
    updated_at
)
SELECT
    u.id                                                          AS employee_id,
    d.outage_date::DATE                                           AS date,
    'present'                                                     AS status,
    s.time_in::TIME                                               AS time_in,
    s.time_out::TIME                                              AS time_out,
    s.session_type                                                AS session_type,
    FALSE                                                         AS is_late,
    0.00                                                          AS late_deduction_hours,
    'Isidro Kintanar Street, Lamacan, Argao, Cebu, Central Visayas, 6021, Philippines' AS clock_in_address,
    'Isidro Kintanar Street, Lamacan, Argao, Cebu, Central Visayas, 6021, Philippines' AS clock_out_address,
    '[Backfill] System outage — record inserted by admin script'  AS notes,
    '--Timeout On time'                                           AS work_doc_note,
    '[]'::JSONB                                                   AS work_doc_file_paths,
    NULL                                                          AS work_doc_uploaded_at,
    NULL                                                          AS work_doc_uploaded_by_id,
    NOW()                                                         AS created_at,
    NOW()                                                         AS updated_at
FROM
    accounts_customuser u
    -- Cross join with outage dates
    CROSS JOIN (
        VALUES ('2026-06-18'), ('2026-06-19')
    ) AS d(outage_date)
    -- Cross join with session definitions
    CROSS JOIN (
        VALUES
            ('morning',   '08:00:00', '12:00:00'),
            ('afternoon', '13:00:00', '17:00:00')
    ) AS s(session_type, time_in, time_out)
WHERE
    u.is_active = TRUE
    -- Skip employees who already have a record for this date + session
    AND NOT EXISTS (
        SELECT 1
        FROM   attendance_attendance a
        WHERE  a.employee_id  = u.id
        AND    a.date         = d.outage_date::DATE
        AND    a.session_type = s.session_type
    );


-- ────────────────────────────────────────────────────────────────────────────
-- 3. INSERT TIMELOG ENTRIES (time_in logs)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO attendance_timelog (
    employee_id,
    attendance_id,
    log_type,
    timestamp,
    location,
    device_info
)
SELECT
    a.employee_id,
    a.id,
    'time_in',
    (a.date + a.time_in)::TIMESTAMP AT TIME ZONE 'Asia/Manila',
    'backfill:outage-recovery',
    'admin-backfill-script'
FROM
    attendance_attendance a
WHERE
    a.date IN ('2026-06-18'::DATE, '2026-06-19'::DATE)
    AND a.notes LIKE '%[Backfill] System outage%'
    AND NOT EXISTS (
        SELECT 1
        FROM   attendance_timelog t
        WHERE  t.attendance_id = a.id
        AND    t.log_type      = 'time_in'
    );


-- ────────────────────────────────────────────────────────────────────────────
-- 4. INSERT TIMELOG ENTRIES (time_out logs)
-- ────────────────────────────────────────────────────────────────────────────

INSERT INTO attendance_timelog (
    employee_id,
    attendance_id,
    log_type,
    timestamp,
    location,
    device_info
)
SELECT
    a.employee_id,
    a.id,
    'time_out',
    (a.date + a.time_out)::TIMESTAMP AT TIME ZONE 'Asia/Manila',
    'backfill:outage-recovery',
    'admin-backfill-script'
FROM
    attendance_attendance a
WHERE
    a.date IN ('2026-06-18'::DATE, '2026-06-19'::DATE)
    AND a.notes LIKE '%[Backfill] System outage%'
    AND NOT EXISTS (
        SELECT 1
        FROM   attendance_timelog t
        WHERE  t.attendance_id = a.id
        AND    t.log_type      = 'time_out'
    );


-- ────────────────────────────────────────────────────────────────────────────
-- 5. VERIFICATION QUERIES — Review these results before committing!
-- ────────────────────────────────────────────────────────────────────────────

-- 5a. Total attendance records inserted
SELECT
    'Attendance Records' AS metric,
    COUNT(*)             AS total
FROM   attendance_attendance
WHERE  date IN ('2026-06-18', '2026-06-19')
AND    notes LIKE '%[Backfill] System outage%';

-- 5b. Breakdown by date and session
SELECT
    date,
    session_type,
    COUNT(*) AS employee_count
FROM   attendance_attendance
WHERE  date IN ('2026-06-18', '2026-06-19')
AND    notes LIKE '%[Backfill] System outage%'
GROUP  BY date, session_type
ORDER  BY date, session_type;

-- 5c. Total time logs inserted
SELECT
    'TimeLogs' AS metric,
    COUNT(*)   AS total
FROM   attendance_timelog
WHERE  device_info = 'admin-backfill-script';

-- 5d. Sample records for spot-check
SELECT
    u.first_name || ' ' || u.last_name AS employee_name,
    a.date,
    a.session_type,
    a.time_in,
    a.time_out,
    a.status,
    a.clock_in_address,
    a.work_doc_note,
    a.notes
FROM   attendance_attendance a
JOIN   accounts_customuser u ON u.id = a.employee_id
WHERE  a.date IN ('2026-06-18', '2026-06-19')
AND    a.notes LIKE '%[Backfill] System outage%'
ORDER  BY u.last_name, u.first_name, a.date, a.session_type
LIMIT  20;


-- ════════════════════════════════════════════════════════════════════════════
-- 6. FINALIZE — After reviewing the verification output above:
--    ✅ Run COMMIT; to save all changes
--    ❌ Run ROLLBACK; to undo everything
-- ════════════════════════════════════════════════════════════════════════════

-- COMMIT;
-- ROLLBACK;
