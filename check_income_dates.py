import sqlite3

def check_income_dates():
    # Connect to the database
    conn = sqlite3.connect('church_management.db')
    conn.row_factory = sqlite3.Row  # This enables column access by name
    cursor = conn.cursor()
    
    # Get all income records
    cursor.execute("SELECT * FROM income ORDER BY id")
    records = cursor.fetchall()
    
    print(f"Found {len(records)} total income records")
    print("\nFirst 5 records:")
    print("-" * 80)
    
    # Print first 5 records with all fields
    for i, record in enumerate(records[:5], 1):
        print(f"Record {i}:")
        for key in record.keys():
            print(f"  {key}: {record[key]}")
        print("-" * 80)
    
    # Count records with null or empty dates
    cursor.execute("SELECT COUNT(*) FROM income WHERE date IS NULL OR date = ''")
    null_date_count = cursor.fetchone()[0]
    print(f"\nRecords with null or empty dates: {null_date_count}")
    
    # Show sample of records with null dates
    if null_date_count > 0:
        print("\nSample of records with null/empty dates:")
        cursor.execute("SELECT id, category, amount, date, created_at FROM income WHERE date IS NULL OR date = '' LIMIT 5")
        for row in cursor.fetchall():
            print(dict(row))
    
    conn.close()

if __name__ == "__main__":
    check_income_dates()
