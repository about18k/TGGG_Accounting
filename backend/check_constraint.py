import sqlite3
conn = sqlite3.connect('db.sqlite3')
print("=== Table columns ===")
for r in conn.execute("PRAGMA table_info(attendance_attendance)").fetchall():
    print(r)
print("\n=== Indexes ===")
for r in conn.execute("PRAGMA index_list(attendance_attendance)").fetchall():
    print(r)
    idx_name = r[1]
    cols = conn.execute(f"PRAGMA index_info('{idx_name}')").fetchall()
    for c in cols:
        print(f"  col: {c}")
conn.close()
