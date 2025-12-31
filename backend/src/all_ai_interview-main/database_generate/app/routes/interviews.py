"""
Interviews API Routes
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models import Interview
from app.database import execute_query

router = APIRouter(prefix="/interviews", tags=["Interviews"])

@router.get("", response_model=List[Interview])
def get_interviews(
    segment_id: Optional[int] = Query(None, description="Filter by segment ID"),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """Get all interviews with optional filters"""
    query = "SELECT * FROM interviews WHERE 1=1"
    params = []
    
    if segment_id is not None:
        query += " AND segment_id = ?"
        params.append(segment_id)
    
    if status:
        query += " AND status = ?"
        params.append(status)
    
    query += " ORDER BY interview_id"
    
    return execute_query(query, tuple(params))

@router.get("/{interview_id}")
def get_interview_detail(interview_id: str):
    """Get complete interview details including persona and transcript"""
    
    # Get interview
    interview_query = "SELECT * FROM interviews WHERE interview_id = ?"
    interview = execute_query(interview_query, (interview_id,), fetch_one=True)
    
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    
    # Get persona
    persona_query = "SELECT * FROM personas WHERE interview_id = ?"
    persona = execute_query(persona_query, (interview_id,), fetch_one=True)
    
    # Get segment
    segment_query = "SELECT * FROM segments WHERE segment_id = ?"
    segment = execute_query(segment_query, (interview['segment_id'],), fetch_one=True)
    
    # Get transcript
    transcript_query = """
        SELECT * FROM transcript_lines 
        WHERE interview_id = ? 
        ORDER BY turn_number
    """
    transcript = execute_query(transcript_query, (interview_id,))
    
    # Get brands mentioned
    brands_query = """
        SELECT b.*, ib.mentioned_count, ib.currently_using, ib.awareness_level
        FROM brands b
        JOIN interview_brands ib ON b.brand_id = ib.brand_id
        WHERE ib.interview_id = ?
    """
    brands = execute_query(brands_query, (interview_id,))
    
    # Get themes
    themes_query = """
        SELECT t.*, it.sentiment, it.quote_sample, it.confidence
        FROM themes t
        JOIN interview_themes it ON t.theme_id = it.theme_id
        WHERE it.interview_id = ?
        ORDER BY it.confidence DESC
    """
    themes = execute_query(themes_query, (interview_id,))
    
    return {
        "interview": interview,
        "persona": persona,
        "segment": segment,
        "transcript": transcript,
        "brands": brands,
        "themes": themes
    }
