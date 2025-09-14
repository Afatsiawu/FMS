import os
import sys
import sqlite3
import json
import io
from datetime import date, datetime
from io import BytesIO
from flask import Flask, request, jsonify, send_file, send_from_directory
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

app = Flask(__name__)

# Serve static files (images, CSS, JS)
@app.route('/<path:filename>')
def serve_static(filename):
    # List of allowed static files
    allowed_files = ['script.js', 'styles.css', 'images.jpg', 'church_management.html']
    if filename in allowed_files:
        try:
            return send_from_directory('.', filename)
        except Exception as e:
            # Try alternative paths if direct access fails
            try:
                return send_from_directory(sys._MEIPASS, filename)
            except:
                return str(e), 404
    return "Not Found", 404

# Database setup
def init_db():
    conn = sqlite3.connect('church_management.db', timeout=20.0)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS income (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # First, check if we need to alter the table
    cursor.execute('''
        PRAGMA table_info(tithes)
    ''')
    columns = [col[1] for col in cursor.fetchall()]
    
    # Create or alter the tithes table
    # First, drop and recreate the tithes table with the correct schema
    cursor.execute('''
        DROP TABLE IF EXISTS tithes
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tithes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_name TEXT NOT NULL,
            member_id TEXT,
            member_phone TEXT,
            month INTEGER NOT NULL,
            week1 REAL,
            week2 REAL,
            week3 REAL,
            week4 REAL,
            week5 REAL,
            offeringWeek1 REAL,
            offeringWeek2 REAL,
            offeringWeek3 REAL,
            offeringWeek4 REAL,
            offeringWeek5 REAL,
            total REAL DEFAULT 0,
            date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create offerings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS offerings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_name TEXT NOT NULL,
            member_id TEXT,
            month INTEGER NOT NULL,
            week1 REAL,
            week2 REAL,
            week3 REAL,
            week4 REAL,
            week5 REAL,
            total REAL DEFAULT 0,
            date TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Add any missing columns to tithes table
    if 'member_id' not in columns:
        cursor.execute('ALTER TABLE tithes ADD COLUMN member_id TEXT')
    if 'date' not in columns:
        cursor.execute('ALTER TABLE tithes ADD COLUMN date TEXT')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            expense_type TEXT DEFAULT 'other',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS district_expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source TEXT NOT NULL,
            original_amount REAL NOT NULL,
            district_amount REAL NOT NULL,
            date TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_name TEXT NOT NULL,
            category TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            condition TEXT NOT NULL,
            date_added TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS accounting_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_name TEXT NOT NULL,
            debit_amount REAL DEFAULT 0,
            credit_amount REAL DEFAULT 0,
            description TEXT NOT NULL,
            reference_id INTEGER,
            reference_type TEXT,
            date TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

@app.route('/')
def index():
    return send_from_directory('.', 'church_management.html')

@app.route('/styles.css')
def styles():
    return send_from_directory('.', 'styles.css')

@app.route('/script.js')
def script():
    return send_from_directory('.', 'script.js')

# API Routes
@app.route('/api/income/<int:income_id>', methods=['DELETE'])
def delete_income(income_id):
    conn = None
    try:
        conn = sqlite3.connect('church_management.db', timeout=20.0)
        cursor = conn.cursor()
        
        # Start transaction
        cursor.execute('BEGIN TRANSACTION')
        
        # Get income details before deleting (for proper accounting reversal)
        cursor.execute('''
            SELECT amount, is_tithe, is_offering, local_amount, district_amount 
            FROM income 
            WHERE id = ?
        ''', (income_id,))
        
        income = cursor.fetchone()
        if not income:
            return jsonify({'success': False, 'message': 'Income record not found'}), 404
            
        # If this was a tithe or offering, we need to handle the district allocation
        if income['is_tithe'] or income['is_offering']:
            # Delete related accounting entries
            cursor.execute('''
                DELETE FROM accounting_entries 
                WHERE reference_id = ? AND reference_type = 'income'
            ''', (income_id,))
            
            # Delete related district expense
            cursor.execute('''
                DELETE FROM district_expenses 
                WHERE description LIKE ? AND status = 'Pending'
            ''', (f'%{income_id}%',))
        
        # Delete the income record
        cursor.execute('DELETE FROM income WHERE id = ?', (income_id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Income record deleted successfully'})
        
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/tithes/<int:tithe_id>', methods=['DELETE'])
def delete_tithe(tithe_id):
    conn = None
    try:
        conn = sqlite3.connect('church_management.db', timeout=20.0)
        cursor = conn.cursor()
        cursor.execute('BEGIN TRANSACTION')
        
        # Get tithe details before deleting
        cursor.execute('''
            SELECT t.*, i.id as income_id 
            FROM tithes t
            LEFT JOIN income i ON i.description LIKE '%' || t.member_name || '%' AND i.is_tithe = 1
            WHERE t.id = ?
        ''', (tithe_id,))
        
        tithe = cursor.fetchone()
        if not tithe:
            return jsonify({'success': False, 'message': 'Tithe record not found'}), 404
        
        # Delete related accounting entries
        if tithe['income_id']:
            cursor.execute('''
                DELETE FROM accounting_entries 
                WHERE reference_id = ? AND reference_type = 'tithe'
            ''', (tithe['income_id'],))
            
            # Delete related income record
            cursor.execute('DELETE FROM income WHERE id = ?', (tithe['income_id'],))
            
            # Delete related district expense
            cursor.execute('''
                DELETE FROM district_expenses 
                WHERE description LIKE ? AND status = 'Pending'
            ''', (f'%{tithe["member_name"]}%Tithe%',))
        
        # Delete the tithe record
        cursor.execute('DELETE FROM tithes WHERE id = ?', (tithe_id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Tithe record deleted successfully'})
        
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    conn = None
    try:
        conn = sqlite3.connect('church_management.db', timeout=20.0)
        cursor = conn.cursor()
        cursor.execute('BEGIN TRANSACTION')
        
        # Delete related accounting entries
        cursor.execute('''
            DELETE FROM accounting_entries 
            WHERE reference_id = ? AND reference_type = 'expense'
        ''', (expense_id,))
        
        # Delete the expense
        cursor.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Expense deleted successfully'})
        
    except sqlite3.Error as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/inventory/<int:item_id>', methods=['DELETE'])
def delete_inventory(item_id):
    conn = None
    try:
        conn = sqlite3.connect('church_management.db', timeout=20.0)
        cursor = conn.cursor()
        
        # Check if item exists
        cursor.execute('SELECT id FROM inventory WHERE id = ?', (item_id,))
        if not cursor.fetchone():
            return jsonify({'success': False, 'message': 'Inventory item not found'}), 404
            
        # Delete the item
        cursor.execute('DELETE FROM inventory WHERE id = ?', (item_id,))
        conn.commit()
        
        return jsonify({'success': True, 'message': 'Inventory item deleted successfully'})
        
    except sqlite3.Error as e:
        return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/income', methods=['GET', 'POST'])
def handle_income():
    conn = None
    try:
        conn = get_db_connection()
        conn.row_factory = sqlite3.Row  # Enable column access by name
        cursor = conn.cursor()
        
        if request.method == 'POST':
            data = request.json
            
            # Input validation
            try:
                amount = float(data.get('amount', 0))
                if amount <= 0:
                    return jsonify({'success': False, 'message': 'Amount must be greater than zero'}), 400
                    
                is_tithe = bool(data.get('is_tithe', False))
                is_offering = bool(data.get('is_offering', False))
                
                # Ensure only one of is_tithe or is_offering is true
                if is_tithe and is_offering:
                    return jsonify({'success': False, 'message': 'Income cannot be both tithe and offering'}), 400
                
                # Calculate local and district amounts for tithes and offerings
                local_amount = amount
                district_amount = 0.0
                
                if is_tithe or is_offering:
                    district_amount = round(amount * 0.77, 2)  # 77% to district
                    local_amount = round(amount - district_amount, 2)  # 23% local retention
                    
                    # Ensure the sum of local and district amounts equals the original amount
                    if abs((local_amount + district_amount) - amount) > 0.01:  # Allow for floating point precision
                        local_amount = amount - district_amount  # Recalculate to ensure exact match
                
                # Get current date if not provided
                transaction_date = data.get('date') or date.today().isoformat()
                
                # Insert the income record with explicit column names
                cursor.execute('''
                    INSERT INTO income (
                        category, description, amount, date, is_tithe, is_offering, 
                        local_amount, district_amount, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    data.get('category', '').strip(),
                    data.get('description', '').strip(),
                    amount,
                    transaction_date,
                    is_tithe,
                    is_offering,
                    local_amount,
                    district_amount
                ))
                
                income_id = cursor.lastrowid
                
                # If this is a tithe or offering, create a district allocation entry
                if is_tithe or is_offering:
                    source_type = 'Tithe' if is_tithe else 'Offering'
                    source_desc = f'{source_type} - {data.get("category", "")}'.strip()
                    
                    # Create district expense record
                    cursor.execute('''
                        INSERT INTO district_expenses (
                            source, description, original_amount, district_amount, 
                            date, status, created_at
                        ) VALUES (?, ?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)
                    ''', (
                        f'{source_type} Allocation',
                        source_desc,
                        amount,
                        district_amount,
                        transaction_date
                    ))
                    
                    # Get the current financial period (YYYY-MM format)
                    period = datetime.strptime(transaction_date, '%Y-%m-%d').strftime('%Y-%m')
                    
                    # Create accounting entries for double-entry
                    # 1. Debit: District Allocation Expense (77%)
                    cursor.execute('''
                        INSERT INTO accounting_entries (
                            account_name, debit_amount, credit_amount, 
                            description, date, period, reference_id, reference_type
                        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?)
                    ''', (
                        'District Allocation Expense',
                        district_amount,
                        f'{source_type} Allocation: {source_desc}',
                        transaction_date,
                        period,
                        income_id,
                        'income'
                    ))
                    
                    # 2. Credit: Income (77%)
                    cursor.execute('''
                        INSERT INTO accounting_entries (
                            account_name, debit_amount, credit_amount, 
                            description, date, period, reference_id, reference_type
                        ) VALUES (?, 0, ?, ?, ?, ?, ?, ?)
                    ''', (
                        f'{source_type} Income',
                        district_amount,
                        f'District Allocation: {source_desc}',
                        transaction_date,
                        period,
                        income_id,
                        'income'
                    ))
                    
                    # 3. Debit: Local Income (23%)
                    cursor.execute('''
                        INSERT INTO accounting_entries (
                            account_name, debit_amount, credit_amount, 
                            description, date, period, reference_id, reference_type
                        ) VALUES (?, ?, 0, ?, ?, ?, ?, ?)
                    ''', (
                        f'Local {source_type} Income',
                        local_amount,
                        f'Local {source_type} Income: {source_desc}',
                        transaction_date,
                        period,
                        income_id,
                        'income'
                    ))
                    
                    # 4. Credit: Income (23%)
                    cursor.execute('''
                        INSERT INTO accounting_entries (
                            account_name, debit_amount, credit_amount, 
                            description, date, period, reference_id, reference_type
                        ) VALUES (?, 0, ?, ?, ?, ?, ?, ?)
                    ''', (
                        f'{source_type} Income',
                        local_amount,
                        f'Local {source_type} Income: {source_desc}',
                        transaction_date,
                        period,
                        income_id,
                        'income'
                    ))
                
                conn.commit()
                return jsonify({
                    'success': True, 
                    'id': income_id,
                    'local_amount': local_amount,
                    'district_amount': district_amount
                })
                
            except ValueError as ve:
                conn.rollback()
                return jsonify({'success': False, 'message': f'Invalid amount: {str(ve)}'}), 400
            except sqlite3.Error as e:
                conn.rollback()
                return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
            except Exception as e:
                conn.rollback()
                return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
            
        else:  # GET request
            try:
                # Get optional query parameters for filtering
                start_date = request.args.get('start_date')
                end_date = request.args.get('end_date')
                is_tithe = request.args.get('is_tithe')
                is_offering = request.args.get('is_offering')
                
                # Base query
                query = 'SELECT * FROM income WHERE 1=1'
                params = []
                
                # Add filters based on query parameters
                if start_date:
                    query += ' AND date >= ?'
                    params.append(start_date)
                if end_date:
                    query += ' AND date <= ?'
                    params.append(end_date)
                if is_tithe is not None:
                    query += ' AND is_tithe = ?'
                    params.append(1 if is_tithe.lower() == 'true' else 0)
                if is_offering is not None:
                    query += ' AND is_offering = ?'
                    params.append(1 if is_offering.lower() == 'true' else 0)
                
                # Add sorting
                query += ' ORDER BY date DESC, created_at DESC'
                
                # Execute query
                cursor.execute(query, params)
                income_data = cursor.fetchall()
                
                # Convert to list of dictionaries
                income_list = []
                for income in income_data:
                    income_list.append({
                        'id': income['id'],
                        'category': income['category'],
                        'description': income['description'],
                        'amount': float(income['amount']) if income['amount'] is not None else 0.0,
                        'date': income['date'],
                        'is_tithe': bool(income['is_tithe']),
                        'is_offering': bool(income['is_offering']),
                        'local_amount': float(income['local_amount']) if income['local_amount'] is not None else 0.0,
                        'district_amount': float(income['district_amount']) if income['district_amount'] is not None else 0.0,
                        'created_at': income['created_at']
                    })
                
                # Calculate totals
                total_amount = sum(item['amount'] for item in income_list)
                total_local = sum(item['local_amount'] for item in income_list)
                total_district = sum(item['district_amount'] for item in income_list)
                
                return jsonify({
                    'success': True,
                    'data': income_list,
                    'totals': {
                        'total_amount': total_amount,
                        'total_local': total_local,
                        'total_district': total_district
                    },
                    'count': len(income_list)
                })
                
            except sqlite3.Error as e:
                return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
            except Exception as e:
                return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
            
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Connection error: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/tithes', methods=['GET', 'POST'])
def handle_tithes():
    conn = None
    try:
        conn = sqlite3.connect('church_management.db', timeout=20.0)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        cursor = conn.cursor()
        
        if request.method == 'POST':
            data = request.json
            
            # Input validation
            try:
                member_name = data.get('memberName', '').strip()
                member_id = data.get('memberId', '').strip()
                month = int(data.get('month', 0))
                week = int(data.get('week', 0))
                tithe_amount = float(data.get('amount', 0))
                
                if not member_name:
                    return jsonify({'success': False, 'message': 'Member name is required'}), 400
                if month < 1 or month > 12:
                    return jsonify({'success': False, 'message': 'Invalid month'}), 400
                if week < 1 or week > 5:
                    return jsonify({'success': False, 'message': 'Invalid week (must be 1-5)'}), 400
                if tithe_amount <= 0:
                    return jsonify({'success': False, 'message': 'Amount must be greater than zero'}), 400
                
                # Get current date for the transaction
                transaction_date = date.today().isoformat()
                
                # Check if member already exists for this month
                cursor.execute('''
                    SELECT * FROM tithes WHERE member_id = ? AND month = ?
                ''', (member_id or member_name, month))
                
                existing = cursor.fetchone()
                
                if existing:
                    # Update existing record - set the specific week (replace, don't add)
                    week_column = f'week{week}'
                    cursor.execute(f'''
                        UPDATE tithes 
                        SET {week_column} = ?,
                            total = (COALESCE(week1, 0) + COALESCE(week2, 0) + COALESCE(week3, 0) + 
                                    COALESCE(week4, 0) + COALESCE(week5, 0)),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE member_id = ? AND month = ?
                    ''', (tithe_amount, member_id or member_name, month))
                else:
                    # Create new record with the specific week's data
                    week_values = [None, None, None, None, None]  # Initialize all weeks to None
                    week_values[week - 1] = tithe_amount  # Set the specific week (1-5 becomes 0-4)
                    
                    cursor.execute('''
                        INSERT INTO tithes (
                            member_name, member_id, month, 
                            week1, week2, week3, week4, week5,
                            total, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ''', [member_name, member_id or member_name, month] + week_values + [tithe_amount])
                
                # Calculate 77% for district and 23% for local
                district_share = round(tithe_amount * 0.77, 2)
                local_share = round(tithe_amount - district_share, 2)
                
                # Add to income as tithe (100% initially, will be split in the income table)
                cursor.execute('''
                    INSERT INTO income (
                        category, description, amount, date, 
                        is_tithe, is_offering, 
                        local_amount, district_amount,
                        created_at
                    ) VALUES (?, ?, ?, ?, 1, 0, ?, ?, CURRENT_TIMESTAMP)
                ''', (
                    f'Tithe - {member_name}',
                    f'Tithe from {member_name} - {date(2000, month, 1).strftime("%B")} Week {week}',
                    tithe_amount,
                    transaction_date,
                    local_share,
                    district_share
                ))
                
                income_id = cursor.lastrowid
                
                # Create district expense record
                cursor.execute('''
                    INSERT INTO district_expenses (
                        source, description, original_amount, district_amount, 
                        date, status, created_at
                    ) VALUES (?, ?, ?, ?, ?, 'Pending', CURRENT_TIMESTAMP)
                ''', (
                    'Tithe Allocation',
                    f'Tithe from {member_name} - {date(2000, month, 1).strftime("%B")} Week {week}',
                    tithe_amount,
                    district_share,
                    transaction_date
                ))
                
                # Get the current financial period (YYYY-MM format)
                period = datetime.now().strftime('%Y-%m')
                
                # Create accounting entries for double-entry
                # 1. Debit: District Allocation Expense (77%)
                cursor.execute('''
                    INSERT INTO accounting_entries (
                        account_name, debit_amount, credit_amount, 
                        description, date, period, reference_id, reference_type
                    ) VALUES (?, ?, 0, ?, ?, ?, ?, ?)
                ''', (
                    'District Allocation Expense',
                    district_share,
                    f'Tithe Allocation: {member_name} - Week {week}',
                    transaction_date,
                    period,
                    income_id,
                    'tithe'
                ))
                
                # 2. Credit: Tithe Income (77%)
                cursor.execute('''
                    INSERT INTO accounting_entries (
                        account_name, debit_amount, credit_amount, 
                        description, date, period, reference_id, reference_type
                    ) VALUES (?, 0, ?, ?, ?, ?, ?, ?)
                ''', (
                    'Tithe Income',
                    district_share,
                    f'District Allocation: {member_name} - Week {week}',
                    transaction_date,
                    period,
                    income_id,
                    'tithe'
                ))
                
                # 3. Debit: Local Tithe Income (23%)
                cursor.execute('''
                    INSERT INTO accounting_entries (
                        account_name, debit_amount, credit_amount, 
                        description, date, period, reference_id, reference_type
                    ) VALUES (?, ?, 0, ?, ?, ?, ?, ?)
                ''', (
                    'Local Tithe Income',
                    local_share,
                    f'Local Tithe Income: {member_name} - Week {week}',
                    transaction_date,
                    period,
                    income_id,
                    'tithe'
                ))
                
                # 4. Credit: Tithe Income (23%)
                cursor.execute('''
                    INSERT INTO accounting_entries (
                        account_name, debit_amount, credit_amount, 
                        description, date, period, reference_id, reference_type
                    ) VALUES (?, 0, ?, ?, ?, ?, ?, ?)
                ''', (
                    'Tithe Income',
                    local_share,
                    f'Local Tithe Income: {member_name} - Week {week}',
                    transaction_date,
                    period,
                    income_id,
                    'tithe'
                ))
                
                conn.commit()
                return jsonify({
                    'success': True, 
                    'message': 'Tithe recorded successfully',
                    'local_amount': local_share,
                    'district_amount': district_share
                })
                
            except ValueError as ve:
                conn.rollback()
                return jsonify({'success': False, 'message': f'Invalid input: {str(ve)}'}), 400
            except sqlite3.Error as e:
                conn.rollback()
                return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
            except Exception as e:
                conn.rollback()
                return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
                
        else:  # GET request
            try:
                # Get optional query parameters for filtering
                month = request.args.get('month')
                member_id = request.args.get('member_id')
                year = request.args.get('year', date.today().year)
                
                # Base query
                query = '''
                    SELECT t.*, 
                           COALESCE(week1, 0) as week1_amount,
                           COALESCE(week2, 0) as week2_amount,
                           COALESCE(week3, 0) as week3_amount,
                           COALESCE(week4, 0) as week4_amount,
                           COALESCE(week5, 0) as week5_amount,
                           total as total_amount,
                           strftime('%Y', date(?, '-3 months')) as financial_year_start,
                           strftime('%Y', date(?, '+9 months')) as financial_year_end
                    FROM tithes t
                    WHERE 1=1
                '''
                
                # Add date condition to filter by financial year (April to March)
                params = [f"{year}-04-01", f"{year}-04-01"]
                
                # Add filters based on query parameters
                if month:
                    query += ' AND month = ?'
                    params.append(int(month))
                    
                if member_id:
                    query += ' AND (member_id = ? OR member_name = ?)'
                    params.extend([member_id, member_id])
                
                # Add sorting
                query += ' ORDER BY month DESC, member_name ASC'
                
                # Execute query
                cursor.execute(query, params)
                tithes_data = cursor.fetchall()
                
                # Convert to list of dictionaries
                tithes_list = []
                for tithe in tithes_data:
                    tithe_dict = dict(tithe)
                    # Convert decimal.Decimal to float for JSON serialization
                    for key in ['week1_amount', 'week2_amount', 'week3_amount', 
                               'week4_amount', 'week5_amount', 'total_amount']:
                        if tithe_dict.get(key) is not None:
                            tithe_dict[key] = float(tithe_dict[key])
                    
                    # Calculate district and local amounts
                    tithe_dict['district_amount'] = round(tithe_dict['total_amount'] * 0.77, 2)
                    tithe_dict['local_amount'] = round(tithe_dict['total_amount'] * 0.23, 2)
                    
                    tithes_list.append(tithe_dict)
                
                # Calculate totals
                total_tithes = sum(t['total_amount'] for t in tithes_list)
                total_district = sum(t['district_amount'] for t in tithes_list)
                total_local = sum(t['local_amount'] for t in tithes_list)
                
                return jsonify({
                    'success': True,
                    'data': tithes_list,
                    'totals': {
                        'total_tithes': total_tithes,
                        'total_district': total_district,
                        'total_local': total_local
                    },
                    'count': len(tithes_list)
                })
                
            except sqlite3.Error as e:
                return jsonify({'success': False, 'message': f'Database error: {str(e)}'}), 500
            except Exception as e:
                return jsonify({'success': False, 'message': f'Unexpected error: {str(e)}'}), 500
                
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({'success': False, 'message': f'Connection error: {str(e)}'}), 500
    finally:
        if conn:
            conn.close()

@app.route('/api/offerings', methods=['GET', 'POST'])
def handle_offerings():
    conn = sqlite3.connect('church_management.db', timeout=20.0)
    cursor = conn.cursor()
    
    if request.method == 'POST':
        data = request.json
        month = int(data['month'])
        week = int(data['week'])
        offering_amount = float(data.get('amount', 0))
        
        print(f"Received offering data: {data}")  # Debug log
        
        # Check if general offering record already exists for this month
        cursor.execute('''
            SELECT * FROM offerings WHERE month = ? AND member_name = 'General Offering'
        ''', (month,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing record
            week_column = f'week{week}'
            cursor.execute(f'''
                UPDATE offerings 
                SET {week_column} = ?,
                    total = (COALESCE(week1, 0) + COALESCE(week2, 0) + COALESCE(week3, 0) + 
                            COALESCE(week4, 0) + COALESCE(week5, 0))
                WHERE month = ? AND member_name = 'General Offering'
            ''', (offering_amount, month))
        else:
            # Create new record with the specific week's data
            values = ['General Offering', None, month]
            values.extend([None] * 5)  # 5 weeks
            values.append(offering_amount)  # total
            
            # Set the specific week's value
            week_index = week - 1
            values[3 + week_index] = offering_amount
            
            cursor.execute('''
                INSERT INTO offerings (
                    member_name, member_id, month, 
                    week1, week2, week3, week4, week5,
                    total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', values)
        
        # Calculate 77% for district and 23% for local
        district_share = round(offering_amount * 0.77, 2)
        local_share = round(offering_amount - district_share, 2)
        
        # Add to income as local share (23%)
        cursor.execute('''
            INSERT INTO income (category, description, amount, date, is_offering, district_amount, local_amount)
            VALUES (?, ?, ?, date('now'), 1, ?, ?)
        ''', ('Offering', f'Offering - Week {week}', 
              offering_amount, district_share, local_share))
        
        # Add district contribution as expense (77%)
        cursor.execute('''
            INSERT INTO expenses (category, description, amount, date, expense_type)
            VALUES (?, ?, ?, date('now'), 'district')
        ''', ('District Offering Contribution', f'Offering contribution to district - Week {week}', 
              district_share))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Offering added successfully'})
    
    else:  # GET
        month = request.args.get('month', type=int)
        if month is not None:
            cursor.execute('SELECT * FROM offerings WHERE month = ?', (month,))
        else:
            cursor.execute('SELECT * FROM offerings')
        
        offering_records = cursor.fetchall()
        conn.close()
        
        offering_list = []
        for record in offering_records:
            offering_list.append({
                'id': record[0],
                'memberName': record[1],
                'memberId': record[2] if len(record) > 2 else None,
                'month': record[3],
                'week1': record[4],
                'week2': record[5],
                'week3': record[6],
                'week4': record[7],
                'week5': record[8],
                'total': record[9] if len(record) > 9 else 0,
                'date': record[10] if len(record) > 10 else None
            })
        
        return jsonify(offering_list)

@app.route('/api/expenses', methods=['GET', 'POST'])
def handle_expenses():
    conn = sqlite3.connect('church_management.db', timeout=20.0)
    cursor = conn.cursor()
    
    if request.method == 'POST':
        data = request.json
        category = data['category']
        description = data['description']
        amount = float(data['amount'])
        date_str = data['date']
        expense_type = data.get('expense_type', 'other')
        
        cursor.execute('''
            INSERT INTO expenses (category, description, amount, date, expense_type)
            VALUES (?, ?, ?, ?, ?)
        ''', (category, description, amount, date_str, expense_type))
        
        expense_id = cursor.lastrowid
        
        # Create accounting entry
        cursor.execute('''
            INSERT INTO accounting_entries 
            (account_name, debit_amount, description, reference_id, reference_type, date)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('Other Expenses', amount, description, expense_id, 'expense', date_str))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Expense added successfully'})
    
    else:  # GET
        expense_type = request.args.get('type', 'other')
        cursor.execute('SELECT * FROM expenses WHERE expense_type = ? ORDER BY date DESC', (expense_type,))
        expense_records = cursor.fetchall()
        conn.close()
        
        expense_list = []
        for record in expense_records:
            expense_list.append({
                'id': record[0],
                'category': record[1],
                'description': record[2],
                'amount': record[3],
                'date': record[4],
                'expense_type': record[5]
            })
        
        return jsonify(expense_list)

@app.route('/api/district-expenses', methods=['GET', 'POST'])
def handle_district_expenses():
    conn = sqlite3.connect('church_management.db', timeout=20.0)
    cursor = conn.cursor()
    
    if request.method == 'POST':
        data = request.json
        source = data['source']
        original_amount = float(data['originalAmount'])
        district_amount = float(data['districtAmount'])
        date_str = data['date']
        status = data.get('status', 'pending')
        
        cursor.execute('''
            INSERT INTO district_expenses (source, original_amount, district_amount, date, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (source, original_amount, district_amount, date_str, status))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'District expense added successfully'})
    
    else:  # GET
        cursor.execute('SELECT * FROM district_expenses ORDER BY date DESC')
        records = cursor.fetchall()
        conn.close()
        
        expense_list = []
        for record in records:
            expense_list.append({
                'id': record[0],
                'source': record[1],
                'originalAmount': record[2],
                'districtAmount': record[3],
                'date': record[4],
                'status': record[5]
            })
        
        return jsonify(expense_list)

@app.route('/api/inventory', methods=['GET', 'POST'])
def handle_inventory():
    conn = sqlite3.connect('church_management.db', timeout=20.0)
    cursor = conn.cursor()
    
    if request.method == 'POST':
        data = request.json
        item_name = data['itemName']
        category = data['category']
        quantity = int(data['quantity'])
        condition = data['condition']
        date_added = date.today().isoformat()
        
        cursor.execute('''
            INSERT INTO inventory (item_name, category, quantity, condition, date_added)
            VALUES (?, ?, ?, ?, ?)
        ''', (item_name, category, quantity, condition, date_added))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Inventory item added successfully'})
    
    else:  # GET
        cursor.execute('SELECT * FROM inventory ORDER BY date_added DESC')
        inventory_records = cursor.fetchall()
        conn.close()
        
        inventory_list = []
        for record in inventory_records:
            inventory_list.append({
                'id': record[0],
                'itemName': record[1],
                'category': record[2],
                'quantity': record[3],
                'condition': record[4],
                'dateAdded': record[5]
            })
        
        return jsonify(inventory_list)

@app.route('/api/district-expenses')
def get_district_expenses():
    conn = sqlite3.connect('church_management.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM district_expenses ORDER BY date DESC')
    records = cursor.fetchall()
    conn.close()
    
    expense_list = []
    for record in records:
        expense_list.append({
            'id': record[0],
            'source': record[1],
            'originalAmount': record[2],
            'districtAmount': record[3],
            'date': record[4],
            'status': record[5]
        })
    
    return jsonify(expense_list)

@app.route('/api/reports/dashboard')
def dashboard_report():
    conn = sqlite3.connect('church_management.db')
    cursor = conn.cursor()
    
    today = date.today().isoformat()
    
    # Today's income (local amount only)
    cursor.execute('''
        SELECT COALESCE(SUM(COALESCE(local_amount, amount)), 0) 
        FROM income WHERE date = ?
    ''', (today,))
    today_income = cursor.fetchone()[0]
    
    # Today's expenses
    cursor.execute('''
        SELECT COALESCE(SUM(amount), 0) 
        FROM expenses WHERE date = ?
    ''', (today,))
    today_expense = cursor.fetchone()[0]
    
    # Monthly totals
    current_month = datetime.now().strftime('%Y-%m')
    cursor.execute('''
        SELECT COALESCE(SUM(COALESCE(local_amount, amount)), 0) 
        FROM income WHERE date LIKE ?
    ''', (f"{current_month}%",))
    monthly_income = cursor.fetchone()[0]
    
    cursor.execute('''
        SELECT COALESCE(SUM(amount), 0) 
        FROM expenses WHERE date LIKE ?
    ''', (f"{current_month}%",))
    monthly_expense = cursor.fetchone()[0]
    
    conn.close()
    
    return jsonify({
        'todayIncome': today_income,
        'todayExpense': today_expense,
        'netBalance': today_income - today_expense
    })

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    # ... rest of your code remains the same ...

if __name__ == '__main__':
    # Set up paths and ensure directories
    if getattr(sys, 'frozen', False):
        app.static_folder = sys._MEIPASS

    ensure_directories()
    
    # Get port from environment variable or use 5000 as default
    port = int(os.environ.get('PORT', 5000))
    # Run the app
    app.run(debug=False, host='0.0.0.0', port=port)