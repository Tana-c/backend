"""
SQLite Database Initialization Script
Imports CSV data from data_ai folder into SQLite database
"""

import sqlite3
import csv
import os
from datetime import datetime

# Database file path
DB_PATH = os.path.join(os.path.dirname(__file__), 'interview_data.db')
CSV_DIR = os.path.join(os.path.dirname(__file__), 'data_ai')

def create_tables(conn):
    """Create all database tables"""
    cursor = conn.cursor()
    
    # Segments table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS segments (
        segment_id INTEGER PRIMARY KEY,
        segment_name_th TEXT,
        segment_name_en TEXT,
        key_focus TEXT,
        description TEXT,
        created_at TEXT
    )
    ''')
    
    # Interviews table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interviews (
        interview_id TEXT PRIMARY KEY,
        segment_id INTEGER,
        topic TEXT,
        interview_date TEXT,
        interview_duration_minutes INTEGER,
        location TEXT,
        interviewer_name TEXT,
        status TEXT,
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY (segment_id) REFERENCES segments(segment_id)
    )
    ''')
    
    # Personas table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS personas (
        interview_id TEXT PRIMARY KEY,
        description_th TEXT,
        description_en TEXT,
        role TEXT,
        age INTEGER,
        gender TEXT,
        environment TEXT,
        usage_pattern TEXT,
        key_drivers TEXT,
        constraints TEXT,
        income_level TEXT,
        education_level TEXT,
        household_size INTEGER,
        created_at TEXT,
        FOREIGN KEY (interview_id) REFERENCES interviews(interview_id)
    )
    ''')
    
    # Brands table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS brands (
        brand_id INTEGER PRIMARY KEY,
        brand_name TEXT NOT NULL,
        brand_name_th TEXT,
        manufacturer TEXT,
        brand_type TEXT,
        market_position TEXT,
        website TEXT,
        description TEXT,
        created_at TEXT
    )
    ''')
    
    # Themes table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS themes (
        theme_id INTEGER PRIMARY KEY,
        theme_name_th TEXT,
        theme_name_en TEXT,
        category TEXT,
        description TEXT,
        parent_theme_id INTEGER,
        created_at TEXT,
        FOREIGN KEY (parent_theme_id) REFERENCES themes(theme_id)
    )
    ''')
    
    # Transcript lines table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS transcript_lines (
        transcript_id INTEGER PRIMARY KEY,
        interview_id TEXT,
        turn_number INTEGER,
        speaker TEXT,
        text TEXT,
        timestamp_seconds REAL,
        language TEXT,
        created_at TEXT,
        FOREIGN KEY (interview_id) REFERENCES interviews(interview_id)
    )
    ''')
    
    # Interview-Brand relationship table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interview_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id TEXT,
        brand_name TEXT,
        currently_using INTEGER,
        has_used_before INTEGER,
        awareness_level TEXT,
        purchase_frequency TEXT,
        satisfaction_score REAL,
        mentioned_count INTEGER,
        notes TEXT,
        brand_id INTEGER,
        FOREIGN KEY (interview_id) REFERENCES interviews(interview_id),
        FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
    )
    ''')
    
    # Interview-Theme relationship table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS interview_themes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id TEXT,
        theme_name TEXT,
        theme_category TEXT,
        sentiment TEXT,
        confidence REAL,
        importance_level TEXT,
        quote_sample TEXT,
        turn_number INTEGER,
        transcript_id INTEGER,
        reasoning TEXT,
        analyst_notes TEXT,
        created_at TEXT,
        theme_id INTEGER,
        FOREIGN KEY (interview_id) REFERENCES interviews(interview_id),
        FOREIGN KEY (theme_id) REFERENCES themes(theme_id)
    )
    ''')
    
    # Brand perceptions table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS brand_perceptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id TEXT,
        brand_name TEXT,
        perception_category TEXT,
        perception_value TEXT,
        sentiment TEXT,
        quote TEXT,
        transcript_id INTEGER,
        created_at TEXT,
        brand_id INTEGER,
        FOREIGN KEY (interview_id) REFERENCES interviews(interview_id),
        FOREIGN KEY (brand_id) REFERENCES brands(brand_id)
    )
    ''')
    
    # Product attributes table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS product_attributes (
        attribute_id INTEGER PRIMARY KEY,
        attribute_name_th TEXT,
        attribute_name_en TEXT,
        attribute_category TEXT
    )
    ''')
    
    # Purchase behaviors table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS purchase_behaviors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        interview_id TEXT,
        purchase_location TEXT,
        purchase_frequency TEXT,
        typical_package_size TEXT,
        price_sensitivity TEXT,
        brand_loyalty TEXT,
        primary_decision_factor TEXT,
        willing_to_pay_premium TEXT,
        bulk_buyer INTEGER,
        online_vs_offline TEXT,
        notes TEXT,
        created_at TEXT,
        FOREIGN KEY (interview_id) REFERENCES interviews(interview_id)
    )
    ''')
    
    conn.commit()
    print("✓ Tables created successfully")

def import_csv_to_table(conn, csv_filename, table_name):
    """Import CSV file into database table"""
    csv_path = os.path.join(CSV_DIR, csv_filename)
    
    if not os.path.exists(csv_path):
        print(f"⚠ Warning: {csv_filename} not found")
        return
    
    cursor = conn.cursor()
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
        if not rows:
            print(f"⚠ Warning: {csv_filename} is empty")
            return
        
        # Get column names from CSV
        columns = list(rows[0].keys())
        placeholders = ','.join(['?' for _ in columns])
        column_names = ','.join(columns)
        
        # Insert data
        for row in rows:
            values = [row[col] if row[col] != '' else None for col in columns]
            cursor.execute(f'INSERT OR REPLACE INTO {table_name} ({column_names}) VALUES ({placeholders})', values)
        
        conn.commit()
        print(f"✓ Imported {len(rows)} rows into {table_name}")

def initialize_database():
    """Main function to initialize database"""
    print("Starting database initialization...")
    print(f"Database path: {DB_PATH}")
    print(f"CSV directory: {CSV_DIR}")
    
    # Remove existing database
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print("✓ Removed existing database")
    
    # Create new database
    conn = sqlite3.connect(DB_PATH)
    
    try:
        # Create tables
        create_tables(conn)
        
        # Import CSV files in order (respecting foreign key constraints)
        print("\nImporting CSV data...")
        import_csv_to_table(conn, 'segments_ai.csv', 'segments')
        import_csv_to_table(conn, 'interviews_ai.csv', 'interviews')
        import_csv_to_table(conn, 'personas_ai.csv', 'personas')
        import_csv_to_table(conn, 'brands_ai.csv', 'brands')
        import_csv_to_table(conn, 'themes_ai.csv', 'themes')
        import_csv_to_table(conn, 'transcript_lines_ai.csv', 'transcript_lines')
        import_csv_to_table(conn, 'interview_brands_ai.csv', 'interview_brands')
        import_csv_to_table(conn, 'interview_themes_ai.csv', 'interview_themes')
        import_csv_to_table(conn, 'brand_perceptions_ai.csv', 'brand_perceptions')
        import_csv_to_table(conn, 'product_attributes_ai.csv', 'product_attributes')
        import_csv_to_table(conn, 'purchase_behaviors_ai.csv', 'purchase_behaviors')
        
        print("\n✓ Database initialized successfully!")
        print(f"Database location: {DB_PATH}")
        
    except Exception as e:
        print(f"✗ Error: {e}")
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    initialize_database()
