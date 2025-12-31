"""
Themes API Routes
"""

from fastapi import APIRouter, HTTPException
from typing import List
from app.models import Theme
from app.database import execute_query

router = APIRouter(prefix="/themes", tags=["Themes"])

@router.get("", response_model=List[Theme])
def get_themes():
    """Get all themes"""
    query = "SELECT * FROM themes ORDER BY theme_id"
    return execute_query(query)

@router.get("/{theme_id}")
def get_theme_insights(theme_id: int):
    """Get theme with related insights from interviews"""
    
    # Get theme
    theme_query = "SELECT * FROM themes WHERE theme_id = ?"
    theme = execute_query(theme_query, (theme_id,), fetch_one=True)
    
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")
    
    # Get insights
    insights_query = """
        SELECT it.*, i.interview_id, p.role, p.age, s.segment_name_th
        FROM interview_themes it
        JOIN interviews i ON it.interview_id = i.interview_id
        JOIN personas p ON i.interview_id = p.interview_id
        JOIN segments s ON i.segment_id = s.segment_id
        WHERE it.theme_id = ?
        ORDER BY it.confidence DESC
    """
    insights = execute_query(insights_query, (theme_id,))
    
    # Get sentiment distribution
    sentiment_query = """
        SELECT 
            sentiment,
            COUNT(*) as count,
            AVG(confidence) as avg_confidence
        FROM interview_themes
        WHERE theme_id = ?
        GROUP BY sentiment
    """
    sentiment_dist = execute_query(sentiment_query, (theme_id,))
    
    return {
        "theme": theme,
        "insights": insights,
        "sentiment_distribution": sentiment_dist
    }

@router.get("/table/all")
def get_themes_table():
    """Get all themes with count and 3 example quotes from different users"""
    
    # Get all themes with mention count
    themes_query = """
        SELECT 
            t.theme_id,
            t.theme_name_th,
            t.theme_name_en,
            COUNT(DISTINCT it.interview_id) as mention_count
        FROM themes t
        LEFT JOIN interview_themes it ON t.theme_id = it.theme_id
        GROUP BY t.theme_id
        ORDER BY mention_count DESC, t.theme_id
    """
    themes = execute_query(themes_query)
    
    # For each theme, get 3 example quotes from different users
    result = []
    for theme in themes:
        examples_query = """
            SELECT 
                it.interview_id,
                it.quote_sample,
                p.role
            FROM interview_themes it
            JOIN personas p ON it.interview_id = p.interview_id
            WHERE it.theme_id = ? AND it.quote_sample IS NOT NULL AND it.quote_sample != ''
            ORDER BY it.confidence DESC
            LIMIT 3
        """
        examples = execute_query(examples_query, (theme['theme_id'],))
        
        result.append({
            "theme_id": theme['theme_id'],
            "theme_name_th": theme['theme_name_th'],
            "theme_name_en": theme['theme_name_en'],
            "mention_count": theme['mention_count'],
            "examples": examples
        })
    
    return result

@router.get("/insights/sentiment")
def get_theme_insights_by_sentiment():
    """Get top positive themes and top negative/mixed themes"""
    
    # Top positive themes
    positive_query = """
        SELECT 
            t.theme_name_th,
            t.theme_name_en,
            COUNT(*) as mention_count
        FROM interview_themes it
        JOIN themes t ON it.theme_id = t.theme_id
        WHERE it.sentiment = 'Positive'
        GROUP BY t.theme_id
        ORDER BY mention_count DESC
        LIMIT 3
    """
    positive_themes = execute_query(positive_query)
    
    # Top negative/mixed themes
    negative_query = """
        SELECT 
            t.theme_name_th,
            t.theme_name_en,
            COUNT(*) as mention_count
        FROM interview_themes it
        JOIN themes t ON it.theme_id = t.theme_id
        WHERE it.sentiment IN ('Negative', 'Mixed')
        GROUP BY t.theme_id
        ORDER BY mention_count DESC
        LIMIT 3
    """
    negative_themes = execute_query(negative_query)
    
    return {
        "positive": positive_themes,
        "negative": negative_themes
    }
