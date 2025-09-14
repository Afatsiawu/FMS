import sqlite3
from datetime import datetime

def fix_income_dates():
    # Connect to the database
    conn = sqlite3.connect('church_management.db')
    cursor = conn.cursor()
    
    # Find all income records with null dates
    cursor.execute("SELECT id, created_at FROM income WHERE date IS NULL OR date = ''")
    records = cursor.fetchall()
    
    print(f"Found {len(records)} income records with missing dates")
    
    # Update each record with a valid date
    for record_id, created_at in records:
        # Use created_at timestamp if available, otherwise use current time
        if created_at:
            try:
                # Convert created_at to YYYY-MM-DD format
                date_str = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S').strftime('%Y-%m-%d')
            except:
                date_str = datetime.now().strftime('%Y-%m-%d')
        else:
            date_str = datetime.now().strftime('%Y-%m-%d')
        
        # Update the record
        cursor.execute("UPDATE income SET date = ? WHERE id = ?", (date_str, record_id))
        print(f"Updated record {record_id} with date {date_str}")
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    print("Finished updating income records")

if __name__ == "__main__":
    fix_income_dates()
