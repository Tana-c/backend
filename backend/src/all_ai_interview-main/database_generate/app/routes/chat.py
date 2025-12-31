"""
Chat API Routes with RAG (Retrieval-Augmented Generation)
Allows users to ask questions about the interview data using natural language
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.database import execute_query
from app.services.openai_service import generate_sql_with_openai, is_openai_configured, generate_report_from_results
import json

router = APIRouter(prefix="/chat", tags=["Chat"])

class ChatMessage(BaseModel):
    message: str
    selected_tables: Optional[List[str]] = None

class ChatResponse(BaseModel):
    response: str
    sql_query: Optional[str] = None
    data: Optional[List[dict]] = None
    table_info: Optional[dict] = None
    report: Optional[str] = None

# Available tables and their descriptions
AVAILABLE_TABLES = {
    "interviews": {
        "description": "Interview metadata including ID, segment, topic, and date",
        "columns": ["interview_id", "segment_id", "topic", "interview_date", "created_at"]
    },
    "personas": {
        "description": "Persona information for each interview including role, age, gender, and behavior patterns",
        "columns": ["interview_id", "description_th", "role", "age", "gender", "environment", "usage_pattern", "key_drivers", "constraints"]
    },
    "themes": {
        "description": "Available themes discussed in interviews",
        "columns": ["theme_id", "theme_name_th", "theme_name_en", "category", "description"]
    },
    "interview_themes": {
        "description": "Themes mentioned in each interview with sentiment and quotes",
        "columns": ["interview_id", "theme_name", "sentiment", "confidence", "importance_level", "quote_sample", "theme_id"]
    },
    "brands": {
        "description": "Brand information",
        "columns": ["brand_id", "brand_name", "brand_name_th", "manufacturer", "brand_type", "market_position"]
    },
    "interview_brands": {
        "description": "Brands mentioned in interviews with usage details",
        "columns": ["interview_id", "brand_name", "currently_using", "has_used_before", "awareness_level", "satisfaction_score", "brand_id"]
    },
    "brand_perceptions": {
        "description": "Brand perception data from interviews",
        "columns": ["interview_id", "brand_name", "perception_category", "perception_value", "sentiment", "quote", "brand_id"]
    },
    "segments": {
        "description": "Customer segments",
        "columns": ["segment_id", "segment_name_th", "segment_name_en", "key_focus", "description"]
    },
    "transcript_lines": {
        "description": "Interview transcript lines",
        "columns": ["transcript_id", "interview_id", "turn_number", "speaker", "text", "timestamp_seconds", "language"]
    }
}

def get_table_schema(table_name: str) -> str:
    """Get schema information for a table"""
    if table_name not in AVAILABLE_TABLES:
        return None
    
    table_info = AVAILABLE_TABLES[table_name]
    return f"Table: {table_name}\nDescription: {table_info['description']}\nColumns: {', '.join(table_info['columns'])}"

def generate_sql_from_question(question: str, selected_tables: List[str] = None) -> str:
    """
    Generate SQL query from natural language question
    This is a simple rule-based approach. In production, you would use an LLM API.
    """
    question_lower = question.lower()
    
    # Default to all tables if none selected
    if not selected_tables:
        selected_tables = list(AVAILABLE_TABLES.keys())
    
    # Common query patterns
    if "how many" in question_lower or "count" in question_lower:
        if "interview" in question_lower:
            return "SELECT COUNT(*) as total_interviews FROM interviews"
        elif "persona" in question_lower:
            return "SELECT COUNT(*) as total_personas FROM personas"
        elif "theme" in question_lower:
            return "SELECT COUNT(*) as total_themes FROM themes"
        elif "brand" in question_lower:
            return "SELECT COUNT(*) as total_brands FROM brands"
    
    # Age-related queries
    if "age" in question_lower:
        if "average" in question_lower or "avg" in question_lower:
            return "SELECT AVG(age) as average_age FROM personas WHERE age IS NOT NULL"
        elif "distribution" in question_lower:
            return """
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
            """
        else:
            return "SELECT interview_id, role, age FROM personas WHERE age IS NOT NULL ORDER BY age"
    
    # Role-related queries
    if "role" in question_lower or "occupation" in question_lower:
        return "SELECT role, COUNT(*) as count FROM personas GROUP BY role ORDER BY count DESC"
    
    # Theme-related queries
    if "theme" in question_lower:
        if "positive" in question_lower:
            return """
                SELECT t.theme_name_th, COUNT(*) as mention_count
                FROM interview_themes it
                JOIN themes t ON it.theme_id = t.theme_id
                WHERE it.sentiment = 'Positive'
                GROUP BY t.theme_id
                ORDER BY mention_count DESC
                LIMIT 10
            """
        elif "negative" in question_lower:
            return """
                SELECT t.theme_name_th, COUNT(*) as mention_count
                FROM interview_themes it
                JOIN themes t ON it.theme_id = t.theme_id
                WHERE it.sentiment = 'Negative'
                GROUP BY t.theme_id
                ORDER BY mention_count DESC
                LIMIT 10
            """
        elif "top" in question_lower or "most" in question_lower:
            return """
                SELECT t.theme_name_th, COUNT(*) as mention_count
                FROM interview_themes it
                JOIN themes t ON it.theme_id = t.theme_id
                GROUP BY t.theme_id
                ORDER BY mention_count DESC
                LIMIT 10
            """
        else:
            return "SELECT theme_id, theme_name_th, theme_name_en FROM themes ORDER BY theme_id"
    
    # Brand-related queries
    if "brand" in question_lower:
        if "top" in question_lower or "most" in question_lower or "popular" in question_lower:
            return """
                SELECT b.brand_name, COUNT(DISTINCT ib.interview_id) as user_count
                FROM interview_brands ib
                JOIN brands b ON ib.brand_id = b.brand_id
                GROUP BY b.brand_id
                ORDER BY user_count DESC
                LIMIT 10
            """
        else:
            return "SELECT brand_id, brand_name, brand_name_th FROM brands ORDER BY brand_name"
    
    # Sentiment analysis
    if "sentiment" in question_lower:
        return """
            SELECT sentiment, COUNT(*) as count
            FROM interview_themes
            GROUP BY sentiment
            ORDER BY count DESC
        """
    
    # Gender distribution
    if "gender" in question_lower:
        return "SELECT gender, COUNT(*) as count FROM personas WHERE gender IS NOT NULL GROUP BY gender"
    
    # Default: show available tables
    return None

@router.post("/ask", response_model=ChatResponse)
def chat_with_database(chat_message: ChatMessage):
    """
    Chat with the database using natural language
    Returns relevant data based on the question
    Uses OpenAI GPT if configured, otherwise falls back to rule-based approach
    """
    try:
        question = chat_message.message.strip()
        selected_tables = chat_message.selected_tables
        
        if not question:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        # Try OpenAI first if configured
        sql_query = None
        using_ai = False
        #print("question()", question, is_openai_configured())
        #print("is_openai_configured()", question, is_openai_configured())
        if is_openai_configured():
            result = generate_sql_with_openai(question, selected_tables)
            if result["success"]:
                sql_query = result["sql_query"]
                using_ai = True
            else:
                print(f"OpenAI error: {result['error']}, falling back to rule-based")
        
        # Fallback to rule-based approach if OpenAI not available or failed
        if not sql_query:
            sql_query = generate_sql_from_question(question, selected_tables)
        
        
        
        if not sql_query:
            # Return available tables and suggestions
            ai_status = "🤖 AI-Powered" if is_openai_configured() else "📋 Rule-Based"
            return ChatResponse(
                response=f"{ai_status}\n\nฉันไม่เข้าใจคำถามของคุณ กรุณาลองถามใหม่ เช่น:\n"
                        f"- มีกี่คนที่สัมภาษณ์?\n"
                        f"- อายุเฉลี่ยของผู้ให้สัมภาษณ์คือเท่าไร?\n"
                        f"- Theme ไหนที่ได้รับความนิยมมากที่สุด?\n"
                        f"- แบรนด์ไหนที่ผู้ใช้พูดถึงมากที่สุด?\n"
                        f"- แสดงการกระจายตัวของอายุ\n"
                        f"- Theme ที่มี sentiment เป็น positive มากที่สุด",
                sql_query=None,
                data=None,
                table_info=AVAILABLE_TABLES
            )
        
        # Execute the query
        result = execute_query(sql_query)
        
        # Generate AI report if OpenAI is configured and we have results
        ai_report = None
        if is_openai_configured() and isinstance(result, list) and len(result) > 0:
            report_result = generate_report_from_results(question, sql_query, result)
            if report_result["success"]:
                ai_report = report_result["report"]
        
        # Format response
        if isinstance(result, list) and len(result) > 0:
            ai_indicator = "🤖 AI" if using_ai else "📋 Rule"
            
            # If we have AI report, use it as the main response
            if ai_report:
                response_text = f"[{ai_indicator}] {ai_report}\n\n---\n\nข้อมูลดิบ: พบ {len(result)} รายการ"
            else:
                # Fallback to simple formatting
                response_text = f"[{ai_indicator}] ฉันพบข้อมูล {len(result)} รายการ:\n\n"
                
                # Format based on query type
                if "COUNT(*)" in sql_query.upper():
                    count_value = result[0].get('total_interviews') or result[0].get('total_personas') or \
                                 result[0].get('total_themes') or result[0].get('total_brands') or \
                                 result[0].get('count') or result[0].get('COUNT(*)')
                    response_text = f"[{ai_indicator}] จำนวนทั้งหมด: {count_value}"
                elif "AVG(age)" in sql_query.upper():
                    avg_age = round(result[0].get('average_age', 0), 1)
                    response_text = f"[{ai_indicator}] อายุเฉลี่ย: {avg_age} ปี"
                else:
                    # Show top results
                    for i, row in enumerate(result[:10], 1):
                        row_text = ", ".join([f"{k}: {v}" for k, v in row.items()])
                        response_text += f"{i}. {row_text}\n"
                    
                    if len(result) > 10:
                        response_text += f"\n... และอีก {len(result) - 10} รายการ"
            
            return ChatResponse(
                response=response_text,
                sql_query=sql_query,
                data=result[:50],  # Limit to 50 rows for performance
                table_info=None,
                report=ai_report
            )
        else:
            return ChatResponse(
                response="ไม่พบข้อมูลที่ตรงกับคำถามของคุณ",
                sql_query=sql_query,
                data=[],
                table_info=None,
                report=None
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")

@router.get("/tables")
def get_available_tables():
    """Get list of available tables and their schemas"""
    return {
        "tables": AVAILABLE_TABLES,
        "total_tables": len(AVAILABLE_TABLES)
    }

@router.get("/suggestions")
def get_query_suggestions():
    """Get sample questions users can ask"""
    return {
        "suggestions": [
            "มีกี่คนที่สัมภาษณ์?",
            "อายุเฉลี่ยของผู้ให้สัมภาษณ์คือเท่าไร?",
            "แสดงการกระจายตัวของอายุ",
            "มีอาชีพอะไรบ้าง?",
            "Theme ไหนที่ได้รับความนิยมมากที่สุด?",
            "Theme ที่มี sentiment เป็น positive มากที่สุด",
            "Theme ที่มี sentiment เป็น negative มากที่สุด",
            "แบรนด์ไหนที่ผู้ใช้พูดถึงมากที่สุด?",
            "แสดงการกระจายตัวของเพศ",
            "แสดงการกระจายตัวของ sentiment"
        ],
        "categories": {
            "general": ["มีกี่คนที่สัมภาษณ์?", "อายุเฉลี่ยของผู้ให้สัมภาษณ์คือเท่าไร?"],
            "demographics": ["แสดงการกระจายตัวของอายุ", "มีอาชีพอะไรบ้าง?", "แสดงการกระจายตัวของเพศ"],
            "themes": ["Theme ไหนที่ได้รับความนิยมมากที่สุด?", "Theme ที่มี sentiment เป็น positive มากที่สุด"],
            "brands": ["แบรนด์ไหนที่ผู้ใช้พูดถึงมากที่สุด?"]
        }
    }
