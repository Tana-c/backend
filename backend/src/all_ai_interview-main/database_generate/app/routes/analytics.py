"""
Analytics API Routes
"""

from fastapi import APIRouter
from app.database import execute_query

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary():
    """Get overall analytics summary"""
    
    # Total counts
    total_interviews = execute_query(
        "SELECT COUNT(*) as total_interviews FROM interviews",
        fetch_one=True
    )['total_interviews']
    
    total_segments = execute_query(
        "SELECT COUNT(*) as total_segments FROM segments",
        fetch_one=True
    )['total_segments']
    
    total_brands = execute_query(
        "SELECT COUNT(*) as total_brands FROM brands",
        fetch_one=True
    )['total_brands']
    
    total_themes = execute_query(
        "SELECT COUNT(*) as total_themes FROM themes",
        fetch_one=True
    )['total_themes']
    
    # Age distribution
    age_distribution = execute_query("""
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
    
    # Top themes
    top_themes = execute_query("""
        SELECT t.theme_name_th, COUNT(*) as mention_count
        FROM interview_themes it
        JOIN themes t ON it.theme_id = t.theme_id
        GROUP BY t.theme_id
        ORDER BY mention_count DESC
        LIMIT 10
    """)
    
    # Brand mentions
    brand_mentions = execute_query("""
        SELECT b.brand_name, COUNT(DISTINCT ib.interview_id) as interview_count
        FROM interview_brands ib
        JOIN brands b ON ib.brand_id = b.brand_id
        GROUP BY b.brand_id
        ORDER BY interview_count DESC
    """)
    
    return {
        "total_interviews": total_interviews,
        "total_segments": total_segments,
        "total_brands": total_brands,
        "total_themes": total_themes,
        "age_distribution": age_distribution,
        "top_themes": top_themes,
        "brand_mentions": brand_mentions
    }
