"""
Transcripts API Routes
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models import TranscriptLine
from app.database import execute_query

router = APIRouter(prefix="/transcripts", tags=["Transcripts"])

@router.get("/{interview_id}", response_model=List[TranscriptLine])
def get_transcript(interview_id: str):
    """Get transcript for an interview"""
    query = """
        SELECT * FROM transcript_lines 
        WHERE interview_id = ? 
        ORDER BY turn_number
    """
    result = execute_query(query, (interview_id,))
    
    if not result:
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    return result

@router.get("/search/text")
def search_transcripts(
    q: str = Query(..., description="Search query"),
    interview_id: Optional[str] = Query(None, description="Filter by interview ID")
):
    """Search transcripts by text content"""
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
    
    return execute_query(query, tuple(params))
