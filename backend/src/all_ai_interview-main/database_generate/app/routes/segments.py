"""
Segments API Routes
"""

from fastapi import APIRouter, HTTPException
from typing import List
from app.models import Segment
from app.database import execute_query

router = APIRouter(prefix="/segments", tags=["Segments"])

@router.get("", response_model=List[Segment])
def get_segments():
    """Get all segments"""
    query = "SELECT * FROM segments ORDER BY segment_id"
    return execute_query(query)

@router.get("/{segment_id}", response_model=Segment)
def get_segment(segment_id: int):
    """Get segment by ID"""
    query = "SELECT * FROM segments WHERE segment_id = ?"
    result = execute_query(query, (segment_id,), fetch_one=True)
    
    if not result:
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return result
