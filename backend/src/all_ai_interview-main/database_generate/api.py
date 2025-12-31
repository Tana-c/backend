"""
FastAPI Backend for Interview Data
RESTful API with SQLite database
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pydantic import BaseModel
import sqlite3
import os
from datetime import datetime

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), 'interview_data.db')

# Initialize FastAPI app
app = FastAPI(
    title="Interview Data API",
    description="API for Dishwashing Liquid Market Research Interview Data",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection helper
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Pydantic models
class Segment(BaseModel):
    segment_id: int
    segment_name_th: Optional[str]
    segment_name_en: Optional[str]
    key_focus: Optional[str]
    description: Optional[str]
    created_at: Optional[str]

class Interview(BaseModel):
    interview_id: str
    segment_id: Optional[int]
    topic: Optional[str]
    interview_date: Optional[str]
    interview_duration_minutes: Optional[int]
    location: Optional[str]
    interviewer_name: Optional[str]
    status: Optional[str]
    notes: Optional[str]
    created_at: Optional[str]

class Persona(BaseModel):
    interview_id: str
    description_th: Optional[str]
    description_en: Optional[str]
    role: Optional[str]
    age: Optional[int]
    gender: Optional[str]
    environment: Optional[str]
    usage_pattern: Optional[str]
    key_drivers: Optional[str]
    constraints: Optional[str]
    income_level: Optional[str]
    education_level: Optional[str]
    household_size: Optional[int]
    created_at: Optional[str]

class Brand(BaseModel):
    brand_id: int
    brand_name: str
    brand_name_th: Optional[str]
    manufacturer: Optional[str]
    brand_type: Optional[str]
    market_position: Optional[str]
    website: Optional[str]
    description: Optional[str]
    created_at: Optional[str]

class Theme(BaseModel):
    theme_id: int
    theme_name_th: Optional[str]
    theme_name_en: Optional[str]
    category: Optional[str]
    description: Optional[str]
    parent_theme_id: Optional[int]
    created_at: Optional[str]

class TranscriptLine(BaseModel):
    transcript_id: int
    interview_id: str
    turn_number: int
    speaker: str
    text: str
    timestamp_seconds: Optional[float]
    language: Optional[str]
    created_at: Optional[str]

# API Endpoints

@app.get("/")
def read_root():
    """API root endpoint"""
    return {
        "message": "Interview Data API",
        "version": "1.0.0",
        "endpoints": {
            "segments": "/segments",
            "interviews": "/interviews",
            "personas": "/personas",
            "brands": "/brands",
            "themes": "/themes",
            "transcripts": "/transcripts",
            "interview_detail": "/interviews/{interview_id}",
            "brand_perceptions": "/brands/{brand_id}/perceptions",
            "theme_insights": "/themes/{theme_id}/insights"
        }
    }

@app.get("/segments", response_model=List[Segment])
def get_segments():
    """Get all segments"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM segments ORDER BY segment_id")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/segments/{segment_id}", response_model=Segment)
def get_segment(segment_id: int):
    """Get segment by ID"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM segments WHERE segment_id = ?", (segment_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Segment not found")
    return dict(row)

@app.get("/interviews", response_model=List[Interview])
def get_interviews(
    segment_id: Optional[int] = Query(None, description="Filter by segment ID"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """Get all interviews with optional filters"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM interviews WHERE 1=1"
    params = []
    
    if segment_id is not None:
        query += " AND segment_id = ?"
        params.append(segment_id)
    
    if status:
        query += " AND status = ?"
        params.append(status)
    
    query += " ORDER BY interview_id"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/interviews/{interview_id}")
def get_interview_detail(interview_id: str):
    """Get complete interview details including persona and transcript"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get interview
    cursor.execute("SELECT * FROM interviews WHERE interview_id = ?", (interview_id,))
    interview = cursor.fetchone()
    if not interview:
        conn.close()
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Get persona
    cursor.execute("SELECT * FROM personas WHERE interview_id = ?", (interview_id,))
    persona = cursor.fetchone()
    
    # Get segment
    cursor.execute("SELECT * FROM segments WHERE segment_id = ?", (interview['segment_id'],))
    segment = cursor.fetchone()
    
    # Get transcript
    cursor.execute("""
        SELECT * FROM transcript_lines 
        WHERE interview_id = ? 
        ORDER BY turn_number
    """, (interview_id,))
    transcript = cursor.fetchall()
    
    # Get brands mentioned
    cursor.execute("""
        SELECT b.*, ib.mention_count, ib.sentiment, ib.context
        FROM brands b
        JOIN interview_brands ib ON b.brand_id = ib.brand_id
        WHERE ib.interview_id = ?
    """, (interview_id,))
    brands = cursor.fetchall()
    
    # Get themes
    cursor.execute("""
        SELECT t.*, it.sentiment, it.quote, it.relevance_score
        FROM themes t
        JOIN interview_themes it ON t.theme_id = it.theme_id
        WHERE it.interview_id = ?
        ORDER BY it.relevance_score DESC
    """, (interview_id,))
    themes = cursor.fetchall()
    
    conn.close()
    
    return {
        "interview": dict(interview),
        "persona": dict(persona) if persona else None,
        "segment": dict(segment) if segment else None,
        "transcript": [dict(row) for row in transcript],
        "brands": [dict(row) for row in brands],
        "themes": [dict(row) for row in themes]
    }

@app.get("/personas", response_model=List[Persona])
def get_personas(
    role: Optional[str] = Query(None, description="Filter by role"),
    min_age: Optional[int] = Query(None, description="Minimum age"),
    max_age: Optional[int] = Query(None, description="Maximum age")
):
    """Get all personas with optional filters"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = "SELECT * FROM personas WHERE 1=1"
    params = []
    
    if role:
        query += " AND role LIKE ?"
        params.append(f"%{role}%")
    
    if min_age is not None:
        query += " AND age >= ?"
        params.append(min_age)
    
    if max_age is not None:
        query += " AND age <= ?"
        params.append(max_age)
    
    query += " ORDER BY interview_id"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/brands", response_model=List[Brand])
def get_brands():
    """Get all brands"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM brands ORDER BY brand_name")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/brands/{brand_id}")
def get_brand_detail(brand_id: int):
    """Get brand details with perceptions and mentions"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get brand
    cursor.execute("SELECT * FROM brands WHERE brand_id = ?", (brand_id,))
    brand = cursor.fetchone()
    if not brand:
        conn.close()
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Get perceptions
    cursor.execute("""
        SELECT bp.*, i.interview_id, p.role
        FROM brand_perceptions bp
        JOIN interviews i ON bp.interview_id = i.interview_id
        JOIN personas p ON i.interview_id = p.interview_id
        WHERE bp.brand_id = ?
        ORDER BY bp.created_at DESC
    """, (brand_id,))
    perceptions = cursor.fetchall()
    
    # Get mention statistics
    cursor.execute("""
        SELECT 
            COUNT(DISTINCT interview_id) as total_mentions,
            AVG(mention_count) as avg_mentions_per_interview,
            SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
            SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count,
            SUM(CASE WHEN sentiment = 'neutral' THEN 1 ELSE 0 END) as neutral_count
        FROM interview_brands
        WHERE brand_id = ?
    """, (brand_id,))
    stats = cursor.fetchone()
    
    conn.close()
    
    return {
        "brand": dict(brand),
        "perceptions": [dict(row) for row in perceptions],
        "statistics": dict(stats) if stats else None
    }

@app.get("/themes", response_model=List[Theme])
def get_themes():
    """Get all themes"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM themes ORDER BY theme_id")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

@app.get("/themes/{theme_id}")
def get_theme_insights(theme_id: int):
    """Get theme with related insights from interviews"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get theme
    cursor.execute("SELECT * FROM themes WHERE theme_id = ?", (theme_id,))
    theme = cursor.fetchone()
    if not theme:
        conn.close()
        raise HTTPException(status_code=404, detail="Theme not found")
    
    # Get insights
    cursor.execute("""
        SELECT it.*, i.interview_id, p.role, p.age, s.segment_name_th
        FROM interview_themes it
        JOIN interviews i ON it.interview_id = i.interview_id
        JOIN personas p ON i.interview_id = p.interview_id
        JOIN segments s ON i.segment_id = s.segment_id
        WHERE it.theme_id = ?
        ORDER BY it.relevance_score DESC
    """, (theme_id,))
    insights = cursor.fetchall()
    
    # Get sentiment distribution
    cursor.execute("""
        SELECT 
            sentiment,
            COUNT(*) as count,
            AVG(relevance_score) as avg_relevance
        FROM interview_themes
        WHERE theme_id = ?
        GROUP BY sentiment
    """, (theme_id,))
    sentiment_dist = cursor.fetchall()
    
    conn.close()
    
    return {
        "theme": dict(theme),
        "insights": [dict(row) for row in insights],
        "sentiment_distribution": [dict(row) for row in sentiment_dist]
    }

@app.get("/transcripts/{interview_id}", response_model=List[TranscriptLine])
def get_transcript(interview_id: str):
    """Get transcript for an interview"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM transcript_lines 
        WHERE interview_id = ? 
        ORDER BY turn_number
    """, (interview_id,))
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    return [dict(row) for row in rows]

@app.get("/search/transcripts")
def search_transcripts(
    q: str = Query(..., description="Search query"),
    interview_id: Optional[str] = Query(None, description="Filter by interview ID")
):
    """Search transcripts by text content"""
    conn = get_db()
    cursor = conn.cursor()
    
    query = """
        SELECT tl.*, i.interview_id, p.role
        FROM transcript_lines tl
        JOIN interviews i ON tl.interview_id = i.interview_id
        JOIN personas p ON i.interview_id = p.interview_id
        WHERE tl.text LIKE ?
    """
    params = [f"%{q}%"]
    
    if interview_id:
        query += " AND tl.interview_id = ?"
        params.append(interview_id)
    
    query += " ORDER BY tl.interview_id, tl.turn_number LIMIT 100"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

@app.get("/analytics/summary")
def get_analytics_summary():
    """Get overall analytics summary"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Total counts
    cursor.execute("SELECT COUNT(*) as total_interviews FROM interviews")
    total_interviews = cursor.fetchone()['total_interviews']
    
    cursor.execute("SELECT COUNT(*) as total_segments FROM segments")
    total_segments = cursor.fetchone()['total_segments']
    
    cursor.execute("SELECT COUNT(*) as total_brands FROM brands")
    total_brands = cursor.fetchone()['total_brands']
    
    cursor.execute("SELECT COUNT(*) as total_themes FROM themes")
    total_themes = cursor.fetchone()['total_themes']
    
    # Age distribution
    cursor.execute("""
        SELECT 
            CASE 
                WHEN age < 25 THEN '18-24'
                WHEN age < 35 THEN '25-34'
                WHEN age < 45 THEN '35-44'
                WHEN age < 55 THEN '45-54'
                ELSE '55+'
            END as age_group,
            COUNT(*) as count
        FROM personas
        WHERE age IS NOT NULL
        GROUP BY age_group
        ORDER BY age_group
    """)
    age_distribution = cursor.fetchall()
    
    # Top themes
    cursor.execute("""
        SELECT t.theme_name_th, COUNT(*) as mention_count
        FROM interview_themes it
        JOIN themes t ON it.theme_id = t.theme_id
        GROUP BY t.theme_id
        ORDER BY mention_count DESC
        LIMIT 10
    """)
    top_themes = cursor.fetchall()
    
    # Brand mentions
    cursor.execute("""
        SELECT b.brand_name, COUNT(DISTINCT ib.interview_id) as interview_count
        FROM interview_brands ib
        JOIN brands b ON ib.brand_id = b.brand_id
        GROUP BY b.brand_id
        ORDER BY interview_count DESC
    """)
    brand_mentions = cursor.fetchall()
    
    conn.close()
    
    return {
        "total_interviews": total_interviews,
        "total_segments": total_segments,
        "total_brands": total_brands,
        "total_themes": total_themes,
        "age_distribution": [dict(row) for row in age_distribution],
        "top_themes": [dict(row) for row in top_themes],
        "brand_mentions": [dict(row) for row in brand_mentions]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
