import sqlite3
from pathlib import Path

def clear_database():
    db_path = Path('church_management.db')
    
    if not db_path.exists():
        print("Error: Database file not found!")
        return
    
    # Create a backup before making changes
    backup_path = db_path.with_stem(f"{db_path.stem}_backup")
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"Created backup at: {backup_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get list of all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [table[0] for table in cursor.fetchall() if table[0] != 'sqlite_sequence']
        
        # Disable foreign keys temporarily
        cursor.execute("PRAGMA foreign_keys = OFF;")
        
        # Clear each table
        for table in tables:
            cursor.execute(f"DELETE FROM {table};")
            print(f"Cleared table: {table}")
        
        # Reset auto-increment counters
        cursor.execute("DELETE FROM sqlite_sequence;")
        
        # Re-enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        conn.commit()
        print("\nAll transactions and data have been cleared from the database.")
        print("A backup has been saved at:", backup_path)
        
    except sqlite3.Error as e:
        print(f"Database error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("WARNING: This will permanently delete all data from the database!")
    confirm = input("Are you sure you want to continue? (yes/no): ")
    
    if confirm.lower() == 'yes':
        clear_database()
    else:
        print("Operation cancelled.")
