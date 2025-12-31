"""
OpenAI Service for Natural Language to SQL Conversion
Uses GPT models to convert user questions into SQL queries
"""

import os
from openai import OpenAI
from typing import Optional, Dict, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Database schema information
DATABASE_SCHEMA = """
# Database Schema for Interview Data

## Tables:

### 1. interviews
- interview_id (TEXT, PRIMARY KEY): Interview identifier (P1-P25)
- segment_id (INTEGER): Customer segment ID
- topic (TEXT): Interview topic
- interview_date (TEXT): Date of interview
- created_at (TEXT): Record creation timestamp

### 2. personas
- interview_id (TEXT, PRIMARY KEY): Links to interviews
- description_th (TEXT): Thai description of persona
- description_en (TEXT): English description
- role (TEXT): Occupation/role (in Thai)
- age (INTEGER): Age of interviewee
- gender (TEXT): Gender
- environment (TEXT): Living/working environment (in Thai)
- usage_pattern (TEXT): Product usage pattern (in Thai)
- key_drivers (TEXT): Key motivations (in Thai)
- constraints (TEXT): Constraints/limitations (in Thai)

### 3. themes
- theme_id (INTEGER, PRIMARY KEY): Theme identifier
- theme_name_th (TEXT): Thai theme name
- theme_name_en (TEXT): English theme name
- category (TEXT): Theme category
- description (TEXT): Theme description

### 4. interview_themes
- interview_id (TEXT): Links to interviews
- theme_name (TEXT): Theme mentioned
- sentiment (TEXT): Sentiment (Positive, Negative, Mixed, Neutral)
- confidence (REAL): Confidence score (0-1)
- importance_level (TEXT): Importance (High, Medium, Low)
- quote_sample (TEXT): Sample quote
- theme_id (INTEGER): Links to themes

### 5. brands
- brand_id (INTEGER, PRIMARY KEY): Brand identifier
- brand_name (TEXT): Brand name
- brand_name_th (TEXT): Thai brand name
- manufacturer (TEXT): Manufacturer
- brand_type (TEXT): Type of brand
- market_position (TEXT): Market position

### 6. interview_brands
- interview_id (TEXT): Links to interviews
- brand_name (TEXT): Brand mentioned
- currently_using (INTEGER): 1 if currently using, 0 otherwise
- has_used_before (INTEGER): 1 if used before, 0 otherwise
- awareness_level (TEXT): Awareness level
- satisfaction_score (REAL): Satisfaction score
- brand_id (INTEGER): Links to brands

### 7. brand_perceptions
- interview_id (TEXT): Links to interviews
- brand_name (TEXT): Brand name
- perception_category (TEXT): Category of perception
- perception_value (TEXT): Perception value
- sentiment (TEXT): Sentiment
- quote (TEXT): Related quote
- brand_id (INTEGER): Links to brands

### 8. segments
- segment_id (INTEGER, PRIMARY KEY): Segment identifier
- segment_name_th (TEXT): Thai segment name
- segment_name_en (TEXT): English segment name
- key_focus (TEXT): Key focus area
- description (TEXT): Segment description

### 9. transcript_lines
- transcript_id (INTEGER, PRIMARY KEY): Transcript line ID
- interview_id (TEXT): Links to interviews
- turn_number (INTEGER): Turn number in conversation
- speaker (TEXT): Speaker (Interviewer/Interviewee)
- text (TEXT): Transcript text
- timestamp_seconds (REAL): Timestamp
- language (TEXT): Language (th/en)

## Important Notes:
- All Thai text fields contain data in Thai language
- Use JOINs to combine data from multiple tables
- COUNT(DISTINCT interview_id) for counting unique interviewees
- Use GROUP BY for aggregations
- SQLite syntax (no LIMIT without ORDER BY)
"""

SYSTEM_PROMPT = """You are an expert SQL query generator for an interview database.
Your task is to convert natural language questions (in Thai or English) into valid SQLite queries.

Rules:
1. Generate ONLY the SQL query, no explanations
2. Use proper SQLite syntax
3. Always use table aliases for clarity
4. Use JOINs when querying multiple tables
5. Include ORDER BY when using LIMIT
6. For Thai questions, search in Thai text fields (fields ending with _th or containing Thai data)
7. Use COUNT(DISTINCT interview_id) to count unique people
8. Return only SELECT queries (no INSERT, UPDATE, DELETE)
9. Limit results to 100 rows maximum for safety
10. Use proper aggregation functions (COUNT, AVG, SUM, etc.)

Examples:

Question: "มีกี่คนที่สัมภาษณ์?"
SQL: SELECT COUNT(*) as total_interviews FROM interviews;

Question: "อายุเฉลี่ยของผู้ให้สัมภาษณ์?"
SQL: SELECT AVG(age) as average_age FROM personas WHERE age IS NOT NULL;

Question: "Theme ไหนที่ positive มากที่สุด?"
SQL: SELECT t.theme_name_th, COUNT(*) as mention_count FROM interview_themes it JOIN themes t ON it.theme_id = t.theme_id WHERE it.sentiment = 'Positive' GROUP BY t.theme_id ORDER BY mention_count DESC LIMIT 10;

Question: "แบรนด์ไหนที่ผู้ใช้พูดถึงมากที่สุด?"
SQL: SELECT b.brand_name, COUNT(DISTINCT ib.interview_id) as user_count FROM interview_brands ib JOIN brands b ON ib.brand_id = b.brand_id GROUP BY b.brand_id ORDER BY user_count DESC LIMIT 10;

Now generate SQL for the following question:
"""

def generate_sql_with_openai(
    question: str, 
    selected_tables: Optional[List[str]] = None,
    model: str = None,
    temperature: float = None
) -> Dict[str, any]:
    """
    Generate SQL query from natural language question using OpenAI GPT
    
    Args:
        question: Natural language question
        selected_tables: Optional list of tables to focus on
        model: OpenAI model to use (default: from env or gpt-4o-mini)
        temperature: Temperature for generation (default: from env or 0.1)
    
    Returns:
        Dict with 'sql_query', 'explanation', and 'success' keys
    """
    try:
        # Get configuration from environment or use defaults
        model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        temperature = temperature or float(os.getenv("OPENAI_TEMPERATURE", "0.1"))
        
        # Build context with schema
        context = DATABASE_SCHEMA
        
        # Add table filtering context if specified
        if selected_tables and len(selected_tables) > 0:
            context += f"\n\nFocus on these tables: {', '.join(selected_tables)}\n"
        
        # Create messages for chat completion
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT + "\n\n" + context},
            {"role": "user", "content": question}
        ]
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=500
        )
        #print("Response", response)
        # Extract SQL query from response
        sql_query = response.choices[0].message.content.strip()
        
        # Clean up the SQL query (remove markdown code blocks if present)
        if sql_query.startswith("```sql"):
            sql_query = sql_query.replace("```sql", "").replace("```", "").strip()
        elif sql_query.startswith("```"):
            sql_query = sql_query.replace("```", "").strip()
        
        # Validate that it's a SELECT query
        if not sql_query.upper().startswith("SELECT"):
            return {
                "success": False,
                "sql_query": None,
                "explanation": "Generated query is not a SELECT statement",
                "error": "Only SELECT queries are allowed"
            }
        
        return {
            "success": True,
            "sql_query": sql_query,
            "explanation": f"Generated using {model}",
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "sql_query": None,
            "explanation": None,
            "error": str(e)
        }

def generate_report_from_results(
    question: str,
    sql_query: str,
    data: List[Dict],
    model: str = None,
    temperature: float = None
) -> Dict[str, any]:
    """
    Generate a comprehensive report/analysis from SQL query results using OpenAI
    
    Args:
        question: Original user question
        sql_query: SQL query that was executed
        data: Query results (list of dictionaries)
        model: OpenAI model to use
        temperature: Temperature for generation
    
    Returns:
        Dict with 'report', 'insights', 'success' keys
    """
    try:
        model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        temperature = temperature or float(os.getenv("OPENAI_TEMPERATURE", "0.3"))
        
        # Prepare data summary
        data_summary = ""
        if data and len(data) > 0:
            # Show first 20 rows for context
            data_preview = data[:20]
            data_summary = f"Query returned {len(data)} rows. Here are the results:\n\n"
            
            # Format data as a readable table
            if data_preview:
                headers = list(data_preview[0].keys())
                data_summary += "| " + " | ".join(headers) + " |\n"
                data_summary += "|" + "|".join(["---" for _ in headers]) + "|\n"
                
                for row in data_preview:
                    values = [str(row.get(h, "")) for h in headers]
                    data_summary += "| " + " | ".join(values) + " |\n"
                
                if len(data) > 20:
                    data_summary += f"\n... and {len(data) - 20} more rows"
        else:
            data_summary = "Query returned no results."
        
        # Create prompt for report generation
        report_prompt = f"""You are a data analyst for interview research. Analyze the following query results and provide a comprehensive report in Thai.

User Question: {question}

SQL Query Used:
{sql_query}

{data_summary}

Please provide:
1. **สรุปผลลัพธ์** (Summary): Brief summary of what the data shows
2. **ข้อมูลเชิงลึก** (Insights): Key insights and patterns found in the data
3. **คำแนะนำ** (Recommendations): Actionable recommendations based on the findings (if applicable)

Format your response in clear Thai language with proper structure and bullet points where appropriate.
Keep it concise but informative (max 300 words)."""

        messages = [
            {"role": "system", "content": "You are an expert data analyst specializing in interview research and consumer insights. Provide clear, actionable analysis in Thai language."},
            {"role": "user", "content": report_prompt}
        ]
        
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=1000
        )
        
        report = response.choices[0].message.content.strip()
        
        return {
            "success": True,
            "report": report,
            "insights": report,  # For backward compatibility
            "error": None
        }
        
    except Exception as e:
        return {
            "success": False,
            "report": None,
            "insights": None,
            "error": str(e)
        }

def is_openai_configured() -> bool:
    """Check if OpenAI API is properly configured"""
    api_key = os.getenv("OPENAI_API_KEY")
    return api_key is not None and api_key != "" and api_key != "your_openai_api_key_here"
