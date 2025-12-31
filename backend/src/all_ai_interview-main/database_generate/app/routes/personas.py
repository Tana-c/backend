"""
Personas API Routes
"""

from fastapi import APIRouter, Query
from typing import List, Optional
from app.models import Persona
from app.database import execute_query

router = APIRouter(prefix="/personas", tags=["Personas"])

@router.get("", response_model=List[Persona])
def get_personas(
    role: Optional[str] = Query(None, description="Filter by role"),
    min_age: Optional[int] = Query(None, description="Minimum age"),
    max_age: Optional[int] = Query(None, description="Maximum age")
):
    """Get all personas with optional filters"""
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
    
    return execute_query(query, tuple(params))
