import sqlite3
import os
from datetime import datetime

def backup_database():
    """Create a backup of the current database."""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = f'church_management_backup_{timestamp}.db'
    if os.path.exists('church_management.db'):
        with open('church_management.db', 'rb') as src, open(backup_file, 'wb') as dst:
            dst.write(src.read())
        print(f'Created backup at: {backup_file}')
    return backup_file

def fix_duplicate_columns():
    """Fix duplicate column issues in the database."""
    conn = sqlite3.connect('church_management.db')
    cursor = conn.cursor()
    
    try:
        # Check if the income table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='income'")
        if not cursor.fetchone():
            print("Income table does not exist. No need to fix.")
            return
            
        # Get current table structure
        cursor.execute('PRAGMA table_info(income)')
        columns = [col[1] for col in cursor.fetchall()]
        
        # Check for duplicate member_id column
        if columns.count('member_id') > 1:
            print("Found duplicate member_id column. Fixing...")
            
            # Create a new table without the duplicate column
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS income_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    description TEXT,
                    amount REAL NOT NULL,
                    category TEXT,
                    is_tithe BOOLEAN DEFAULT 0,
                    is_offering BOOLEAN DEFAULT 0,
                    district_amount REAL DEFAULT 0,
                    local_amount REAL DEFAULT 0,
                    member_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Copy data from old table to new table (excluding any duplicate columns)
            print("Migrating data to new table...")
            cursor.execute('''
                INSERT INTO income_new (
                    id, date, description, amount, category,
                    is_tithe, is_offering, district_amount, local_amount, 
                    member_id, created_at, updated_at
                )
                SELECT DISTINCT 
                    id, date, description, amount, category,
                    COALESCE(is_tithe, 0), COALESCE(is_offering, 0),
                    COALESCE(district_amount, 0), COALESCE(local_amount, 0),
                    member_id, COALESCE(created_at, CURRENT_TIMESTAMP), 
                    COALESCE(updated_at, CURRENT_TIMESTAMP)
                FROM income
            ''')
            
            # Drop old table and rename new one
            cursor.execute('DROP TABLE income')
            cursor.execute('ALTER TABLE income_new RENAME TO income')
            print("Successfully fixed duplicate columns in income table.")
        else:
            print("No duplicate columns found in income table.")
            
        conn.commit()
        
    except Exception as e:
        print(f"Error fixing duplicate columns: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

def update_income_table():
    """Update the income table schema to ensure all required columns exist."""
    conn = sqlite3.connect('church_management.db')
    cursor = conn.cursor()
    
    try:
        # Check if the income table exists, create if not
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='income'")
        if not cursor.fetchone():
            print("Income table does not exist. Creating it...")
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS income (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    description TEXT,
                    amount REAL NOT NULL,
                    category TEXT,
                    is_tithe BOOLEAN DEFAULT 0,
                    is_offering BOOLEAN DEFAULT 0,
                    district_amount REAL DEFAULT 0,
                    local_amount REAL DEFAULT 0,
                    member_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            print("Created new income table.")
            conn.commit()
            return
            
        # Check for missing columns and add them if necessary
        cursor.execute('PRAGMA table_info(income)')
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'is_tithe' not in columns:
            print("Adding is_tithe column...")
            cursor.execute('ALTER TABLE income ADD COLUMN is_tithe BOOLEAN DEFAULT 0')
            
        if 'is_offering' not in columns:
            print("Adding is_offering column...")
            cursor.execute('ALTER TABLE income ADD COLUMN is_offering BOOLEAN DEFAULT 0')
            
        if 'district_amount' not in columns:
            print("Adding district_amount column...")
            cursor.execute('ALTER TABLE income ADD COLUMN district_amount REAL DEFAULT 0')
            
        if 'local_amount' not in columns:
            print("Adding local_amount column...")
            cursor.execute('ALTER TABLE income ADD COLUMN local_amount REAL DEFAULT 0')
            
        if 'member_id' not in columns:
            print("Adding member_id column...")
            cursor.execute('ALTER TABLE income ADD COLUMN member_id INTEGER')
            
        # Update existing records to calculate local and district amounts if needed
        cursor.execute('''
            UPDATE income 
            SET district_amount = amount * 0.77,
                local_amount = amount * 0.23
            WHERE (is_tithe = 1 OR is_offering = 1) 
            AND (district_amount = 0 OR local_amount = 0)
        ''')
        
        conn.commit()
        print("Successfully updated income table schema.")
        
    except Exception as e:
        print(f"Error updating database schema: {e}")
        conn.rollback()
        raise
    finally:
        if conn:
            conn.close()

def update_all_tables():
    """Update all database tables to ensure they have the correct schema."""
    print("Starting database update...")
    backup_file = backup_database()
    print(f"Database backup created at: {backup_file}")
    
    try:
        # First fix any duplicate columns
        fix_duplicate_columns()
        
        # Then update the table schema
        update_income_table()
        
        print("Database update completed successfully!")
    except Exception as e:
        print(f"Error during database update: {str(e)}")
        print(f"Please restore from backup: {backup_file}")
        raise

if __name__ == "__main__":
    update_all_tables()
