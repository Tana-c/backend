"""
Brands API Routes
"""

from fastapi import APIRouter, HTTPException
from typing import List
from app.models import Brand
from app.database import execute_query

router = APIRouter(prefix="/brands", tags=["Brands"])

@router.get("", response_model=List[Brand])
def get_brands():
    """Get all brands"""
    query = "SELECT * FROM brands ORDER BY brand_name"
    return execute_query(query)

@router.get("/{brand_id}")
def get_brand_detail(brand_id: int):
    """Get brand details with perceptions and mentions"""
    
    # Get brand
    brand_query = "SELECT * FROM brands WHERE brand_id = ?"
    brand = execute_query(brand_query, (brand_id,), fetch_one=True)
    
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    
    # Get perceptions
    perceptions_query = """
        SELECT bp.*, i.interview_id, p.role
        FROM brand_perceptions bp
        JOIN interviews i ON bp.interview_id = i.interview_id
        JOIN personas p ON i.interview_id = p.interview_id
        WHERE bp.brand_id = ?
        ORDER BY bp.created_at DESC
    """
    perceptions = execute_query(perceptions_query, (brand_id,))
    
    # Get mention statistics
    stats_query = """
        SELECT 
            COUNT(DISTINCT interview_id) as total_mentions,
            AVG(mentioned_count) as avg_mentions_per_interview,
            SUM(CASE WHEN currently_using = 1 THEN 1 ELSE 0 END) as currently_using_count,
            SUM(CASE WHEN has_used_before = 1 THEN 1 ELSE 0 END) as has_used_count
        FROM interview_brands
        WHERE brand_id = ?
    """
    stats = execute_query(stats_query, (brand_id,), fetch_one=True)
    
    return {
        "brand": brand,
        "perceptions": perceptions,
        "statistics": stats
    }
