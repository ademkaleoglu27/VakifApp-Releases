import sqlite3
import os

DB_PATH = r"c:\VakifApp\assets\risale.db"

def check_chunk():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check paragraphs for Section 3 (sozler-03)
    # We suspect it's near the end.
    cursor.execute("SELECT text, order_index, is_arabic FROM paragraphs WHERE section_id='sozler-03' ORDER BY order_index")
    rows = cursor.fetchall()
    
    print(f"Found {len(rows)} chunks for sozler-03")
    
    for row in rows:
        text = row[0]
        if "Elhasıl" in text:
            print(f"--- CHUNK {row[1]} ---")
            print(text)
            print("-------------------")

    conn.close()

if __name__ == "__main__":
    check_chunk()
