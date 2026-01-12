import sqlite3
import os

db_path = 'assets/risale.db'

if not os.path.exists(db_path):
    print(f"DB not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check count for First Word
sid1 = 'sozler-section-001'
cursor.execute("SELECT COUNT(*) FROM paragraphs WHERE section_id = ?", (sid1,))
count1 = cursor.fetchone()[0]
print(f"{sid1}: {count1} chunks")

# Check count for Second Word
sid2 = 'sozler-section-003'
cursor.execute("SELECT COUNT(*) FROM paragraphs WHERE section_id = ?", (sid2,))
count2 = cursor.fetchone()[0]
print(f"{sid2}: {count2} chunks")

# Check distinct section IDs to verify what exists
cursor.execute("SELECT DISTINCT section_id FROM paragraphs LIMIT 10")
print("Sample distinct section_ids:", cursor.fetchall())

# Check if First Word contains text 'İkinci Söz' (indicating leak)
cursor.execute("SELECT text FROM paragraphs WHERE section_id = ? AND text LIKE '%İkinci Söz%'", (sid1,))
leaks = cursor.fetchall()
if leaks:
    print(f"Possible Leak in {sid1}: Found 'İkinci Söz' inside it.")
    for l in leaks:
        print(f" - {l[0][:50]}...")
else:
    print(f"No explicit 'İkinci Söz' header found in {sid1}.")

conn.close()
