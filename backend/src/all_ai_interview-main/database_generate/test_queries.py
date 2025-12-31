"""
Test script to verify SQL queries for executive summary
"""
import sqlite3
import json

def test_queries():
    conn = sqlite3.connect('interview_data.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=" * 80)
    print("TESTING EXECUTIVE SUMMARY QUERIES")
    print("=" * 80)
    
    # 1. Top Positive Themes
    print("\n1. TOP POSITIVE THEMES:")
    print("-" * 80)
    result = cursor.execute("""
        SELECT t.theme_name_th, COUNT(*) as count
        FROM interview_themes it
        JOIN themes t ON it.theme_id = t.theme_id
        WHERE it.sentiment = 'Positive'
        GROUP BY t.theme_id
        ORDER BY count DESC
        LIMIT 5
    """).fetchall()
    
    for row in result:
        print(f"  - {row['theme_name_th']}: {row['count']} mentions")
    print(f"  Total rows: {len(result)}")
    
    # 2. Top Negative Themes
    print("\n2. TOP NEGATIVE/MIXED THEMES:")
    print("-" * 80)
    result = cursor.execute("""
        SELECT t.theme_name_th, COUNT(*) as count
        FROM interview_themes it
        JOIN themes t ON it.theme_id = t.theme_id
        WHERE it.sentiment IN ('Negative', 'Mixed')
        GROUP BY t.theme_id
        ORDER BY count DESC
        LIMIT 5
    """).fetchall()
    
    for row in result:
        print(f"  - {row['theme_name_th']}: {row['count']} mentions")
    print(f"  Total rows: {len(result)}")
    
    # 3. Brand Data
    print("\n3. BRAND PERFORMANCE:")
    print("-" * 80)
    result = cursor.execute("""
        SELECT 
            b.brand_name,
            COUNT(DISTINCT ib.interview_id) as user_count,
            AVG(ib.satisfaction_score) as avg_satisfaction,
            SUM(CASE WHEN ib.currently_using = 1 THEN 1 ELSE 0 END) as current_users
        FROM interview_brands ib
        JOIN brands b ON ib.brand_id = b.brand_id
        GROUP BY b.brand_id
        ORDER BY user_count DESC
        LIMIT 5
    """).fetchall()
    
    for row in result:
        avg_sat = row['avg_satisfaction']
        avg_sat_str = f"{avg_sat:.1f}" if avg_sat is not None else "N/A"
        print(f"  - {row['brand_name']}: {row['user_count']} users, Satisfaction: {avg_sat_str}/5, Currently Using: {row['current_users']}")
    print(f"  Total rows: {len(result)}")
    
    # 4. Demographics
    print("\n4. DEMOGRAPHICS:")
    print("-" * 80)
    result = cursor.execute("""
        SELECT 
            COUNT(*) as total_interviews,
            AVG(age) as avg_age,
            COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_count,
            COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_count
        FROM personas
    """).fetchone()
    
    avg_age = result['avg_age']
    avg_age_str = f"{avg_age:.1f}" if avg_age is not None else "N/A"
    print(f"  - Total Interviews: {result['total_interviews']}")
    print(f"  - Average Age: {avg_age_str} years")
    print(f"  - Female: {result['female_count']}, Male: {result['male_count']}")
    
    # 5. Key Quotes
    print("\n5. KEY QUOTES (High Importance):")
    print("-" * 80)
    result = cursor.execute("""
        SELECT 
            it.theme_name,
            it.sentiment,
            it.quote_sample,
            p.role
        FROM interview_themes it
        JOIN personas p ON it.interview_id = p.interview_id
        WHERE it.importance_level = 'High' 
        AND it.quote_sample IS NOT NULL 
        AND it.quote_sample != ''
        ORDER BY it.confidence DESC
        LIMIT 10
    """).fetchall()
    
    for i, row in enumerate(result[:5], 1):
        quote = row['quote_sample'][:80] + "..." if len(row['quote_sample']) > 80 else row['quote_sample']
        print(f"  {i}. [{row['theme_name']}] ({row['sentiment']}) - {row['role']}")
        print(f"     \"{quote}\"")
    print(f"  Total rows: {len(result)}")
    
    print("\n" + "=" * 80)
    print("QUERY TESTING COMPLETE")
    print("=" * 80)
    
    conn.close()

if __name__ == "__main__":
    test_queries()
