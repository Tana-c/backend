"""
Simple test to show context generation output
"""
import sqlite3

conn = sqlite3.connect('interview_data.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Execute all queries
top_positive_themes = [dict(row) for row in cursor.execute("""
    SELECT t.theme_name_th, COUNT(*) as count
    FROM interview_themes it
    JOIN themes t ON it.theme_id = t.theme_id
    WHERE it.sentiment = 'Positive'
    GROUP BY t.theme_id
    ORDER BY count DESC
    LIMIT 5
""").fetchall()]

top_negative_themes = [dict(row) for row in cursor.execute("""
    SELECT t.theme_name_th, COUNT(*) as count
    FROM interview_themes it
    JOIN themes t ON it.theme_id = t.theme_id
    WHERE it.sentiment IN ('Negative', 'Mixed')
    GROUP BY t.theme_id
    ORDER BY count DESC
    LIMIT 5
""").fetchall()]

brand_data = [dict(row) for row in cursor.execute("""
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
""").fetchall()]

demographics = dict(cursor.execute("""
    SELECT 
        COUNT(*) as total_interviews,
        AVG(age) as avg_age,
        COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_count,
        COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_count
    FROM personas
""").fetchone())

key_quotes = [dict(row) for row in cursor.execute("""
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
""").fetchall()]

conn.close()

# Generate context exactly as in insights.py
avg_age = demographics.get('avg_age')
avg_age_str = f"{avg_age:.1f}" if avg_age is not None else "N/A"

context = f"""
# Interview Research Data Summary

## Demographics
- Total Interviews: {demographics.get('total_interviews', 0)}
- Average Age: {avg_age_str} years
- Gender Distribution: {demographics.get('female_count', 0)} Female, {demographics.get('male_count', 0)} Male

## Top Positive Themes (Most Mentioned)
{chr(10).join([f"- {t.get('theme_name_th', 'Unknown')}: {t.get('count', 0)} mentions" for t in top_positive_themes]) if top_positive_themes else "No data available"}

## Top Concerns/Issues (Negative/Mixed Sentiment)
{chr(10).join([f"- {t.get('theme_name_th', 'Unknown')}: {t.get('count', 0)} mentions" for t in top_negative_themes]) if top_negative_themes else "No data available"}

## Brand Performance
{chr(10).join([f"- {b.get('brand_name', 'Unknown')}: {b.get('user_count', 0)} users, Satisfaction: {b.get('avg_satisfaction') if b.get('avg_satisfaction') is not None else 'N/A'}/5, Currently Using: {b.get('current_users', 0)}" for b in brand_data]) if brand_data else "No data available"}

## Sample Key Quotes
{chr(10).join([f'- [{q.get("theme_name", "Unknown")}] ({q.get("sentiment", "N/A")}) - {q.get("role", "Unknown")}: "{str(q.get("quote_sample", ""))[:100]}..."' for q in key_quotes[:5]]) if key_quotes else "No quotes available"}
"""

print(context)
print("\n" + "="*80)
print(f"Length: {len(context)} chars, ~{len(context)//4} tokens")
