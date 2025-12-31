"""
Database connection and utilities
"""

import sqlite3
import os
from typing import Optional

# Database path
DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'interview_data.db')

def get_db():
    """Get database connection with Row factory"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(query: str, params: tuple = (), fetch_one: bool = False):
    """
    Execute a query and return results
    
    Args:
        query: SQL query string
        params: Query parameters
        fetch_one: If True, return single row; otherwise return all rows
    
    Returns:
        Single row dict or list of row dicts
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(query, params)
    
    if fetch_one:
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    else:
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

def execute_insert(query: str, params: tuple = ()):
    """
    Execute an insert/update/delete query
    
    Args:
        query: SQL query string
        params: Query parameters
    
    Returns:
        Last row ID
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(query, params)
    last_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return last_id
