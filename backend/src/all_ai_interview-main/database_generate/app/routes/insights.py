"""
Insights API Routes
Generate executive summary and insights from interview data using AI
"""

from fastapi import APIRouter, HTTPException
from app.database import execute_query
from app.services.openai_service import is_openai_configured
from openai import OpenAI
import os

router = APIRouter(prefix="/insights", tags=["Insights"])

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)

def extract_key_findings(summary_text: str) -> list:
    """
    Extract key findings from AI summary text
    Looks for numbered findings (1., 2., 3.) and extracts title, description, and opportunity
    """
    findings = []
    lines = summary_text.split('\n')
    
    current_finding = None
    in_findings_section = False
    
    for i, line in enumerate(lines):
        # Detect Key Findings section
        if 'ข้อค้นพบสำคัญ' in line or 'Key Findings' in line:
            in_findings_section = True
            continue
        
        # Exit findings section when hitting next major section
        if in_findings_section and ('คำแนะนำ' in line or 'Recommendations' in line or 'Insights เชิงลึก' in line):
            if current_finding:
                findings.append(current_finding)
            break
        
        if in_findings_section:
            # Detect numbered finding (1., 2., 3., **1., etc.)
            if line.strip().startswith(('1.', '2.', '3.', '**1.', '**2.', '**3.')):
                # Save previous finding
                if current_finding:
                    findings.append(current_finding)
                
                # Start new finding
                title = line.strip()
                # Remove markdown and numbering
                title = title.replace('**', '').strip()
                
                current_finding = {
                    "title": title,
                    "description": "",
                    "opportunity": ""
                }
            
            # Extract opportunity first (before description)
            elif current_finding and ('โอกาส' in line or 'Opportunity' in line):
                # Get opportunity text
                opp_text = line.split(':', 1)[-1].strip() if ':' in line else ""
                # Check next lines for continuation
                for j in range(i+1, min(i+3, len(lines))):
                    next_line = lines[j].strip()
                    if next_line and not next_line.startswith(('1.', '2.', '3.', '**', '###', '##', 'โอกาส', 'Opportunity')):
                        opp_text += " " + next_line
                    else:
                        break
                current_finding["opportunity"] = opp_text.strip()
            
            # Collect description lines (including bullet points)
            elif current_finding and line.strip():
                # Skip if already processed as opportunity
                if not ('โอกาส' in line or 'Opportunity' in line):
                    # Include bullet points and regular text
                    text = line.strip()
                    if text.startswith('-'):
                        text = text[1:].strip()  # Remove bullet but keep text
                    current_finding["description"] += text + " "
    
    # Add last finding
    if current_finding:
        findings.append(current_finding)
    
    # Clean up findings
    for finding in findings:
        finding["description"] = finding["description"].strip()
        finding["opportunity"] = finding["opportunity"].strip()
    
    return findings[:3]  # Return max 3 findings

@router.get("/executive-summary")
def get_executive_summary():
    """
    Generate comprehensive executive summary with AI-powered insights
    Analyzes all interview data and provides strategic recommendations
    """
    
    if not is_openai_configured():
        # Return fallback summary if OpenAI not configured
        return {
            "success": False,
            "summary": "OpenAI API not configured. Please set OPENAI_API_KEY in .env file.",
            "key_findings": [],
            "recommendations": []
        }
    
    try:
        # Gather comprehensive data from database
        
        # 1. Top themes by sentiment
        top_positive_themes = execute_query("""
            SELECT t.theme_name_th, COUNT(*) as count
            FROM interview_themes it
            JOIN themes t ON it.theme_id = t.theme_id
            WHERE it.sentiment = 'Positive'
            GROUP BY t.theme_id
            ORDER BY count DESC
            LIMIT 5
        """)
        
        top_negative_themes = execute_query("""
            SELECT t.theme_name_th, COUNT(*) as count
            FROM interview_themes it
            JOIN themes t ON it.theme_id = t.theme_id
            WHERE it.sentiment IN ('Negative', 'Mixed')
            GROUP BY t.theme_id
            ORDER BY count DESC
            LIMIT 5
        """)
        
        # 2. Brand mentions and satisfaction
        brand_data = execute_query("""
            SELECT 
                b.brand_name,
                COUNT(DISTINCT ib.interview_id) as user_count,
                AVG(ib.satisfaction_score) as avg_satisfaction,
                SUM(CASE WHEN ib.currently_using = 1 THEN 1 ELSE 0 END) as current_users
            FROM interview_brands ib
            JOIN brands b ON ib.brand_id = b.brand_id
            GROUP BY b.brand_id
            ORDER BY user_count DESC
            LIMIT 5
        """)
        
        # 3. Demographics summary
        demographics = execute_query("""
            SELECT 
                COUNT(*) as total_interviews,
                AVG(age) as avg_age,
                COUNT(CASE WHEN gender = 'Female' THEN 1 END) as female_count,
                COUNT(CASE WHEN gender = 'Male' THEN 1 END) as male_count
            FROM personas
        """)[0]
        
        # 4. Key quotes for context
        key_quotes = execute_query("""
            SELECT 
                it.theme_name,
                it.sentiment,
                it.quote_sample,
                p.role
            FROM interview_themes it
            JOIN personas p ON it.interview_id = p.interview_id
            WHERE it.importance_level = 'High' 
            AND it.quote_sample IS NOT NULL 
            AND it.quote_sample != ''
            ORDER BY it.confidence DESC
            LIMIT 10
        """)
        
        # Prepare context for AI with null safety
        avg_age = demographics.get('avg_age')
        avg_age_str = f"{avg_age:.1f}" if avg_age is not None else "N/A"
        
        context = f"""
# Interview Research Data Summary

## Demographics
- Total Interviews: {demographics.get('total_interviews', 0)}
- Average Age: {avg_age_str} years
- Gender Distribution: {demographics.get('female_count', 0)} Female, {demographics.get('male_count', 0)} Male

## Top Positive Themes (Most Mentioned)
{chr(10).join([f"- {t.get('theme_name_th', 'Unknown')}: {t.get('count', 0)} mentions" for t in top_positive_themes]) if top_positive_themes else "No data available"}

## Top Concerns/Issues (Negative/Mixed Sentiment)
{chr(10).join([f"- {t.get('theme_name_th', 'Unknown')}: {t.get('count', 0)} mentions" for t in top_negative_themes]) if top_negative_themes else "No data available"}

## Brand Performance
{chr(10).join([f"- {b.get('brand_name', 'Unknown')}: {b.get('user_count', 0)} users, Satisfaction: {b.get('avg_satisfaction') if b.get('avg_satisfaction') is not None else 'N/A'}/5, Currently Using: {b.get('current_users', 0)}" for b in brand_data]) if brand_data else "No data available"}

## Sample Key Quotes
{chr(10).join([f'- [{q.get("theme_name", "Unknown")}] ({q.get("sentiment", "N/A")}) - {q.get("role", "Unknown")}: "{str(q.get("quote_sample", ""))[:100]}..."' for q in key_quotes[:5]]) if key_quotes else "No quotes available"}
"""
        #print("Gather comprehensive data from database last step v2", context)
        # Generate executive summary with AI
        prompt = """คุณเป็นนักวิเคราะห์ข้อมูลผู้บริโภคระดับผู้บริหาร วิเคราะห์ข้อมูลการสัมภาษณ์เชิงลึกเกี่ยวกับผลิตภัณฑ์น้ำยาล้างจาน และสร้าง Executive Summary ที่ครอบคลุม

โปรดจัดทำรายงานในรูปแบบ:

## 📊 บทสรุปผู้บริหาร (Executive Summary)

### 🎯 ภาพรวมตลาด (Market Overview)
[สรุปภาพรวมของตลาดและพฤติกรรมผู้บริโภค 2-3 ประโยค]

### 💡 ข้อค้นพบสำคัญ (Key Findings)

**1. [หัวข้อข้อค้นพบที่ 1]**
- [รายละเอียด]
- [ข้อมูลสนับสนุน]
- **โอกาส:** [โอกาสทางธุรกิจ]

**2. [หัวข้อข้อค้นพบที่ 2]**
- [รายละเอียด]
- [ข้อมูลสนับสนุน]
- **โอกาส:** [โอกาสทางธุรกิจ]

**3. [หัวข้อข้อค้นพบที่ 3]**
- [รายละเอียด]
- [ข้อมูลสนับสนุน]
- **โอกาส:** [โอกาสทางธุรกิจ]

### 🎯 คำแนะนำเชิงกลยุทธ์ (Strategic Recommendations)

**ระยะสั้น (0-3 เดือน):**
1. [คำแนะนำที่ 1]
2. [คำแนะนำที่ 2]

**ระยะกลาง (3-6 เดือน):**
1. [คำแนะนำที่ 1]
2. [คำแนะนำที่ 2]

**ระยะยาว (6-12 เดือน):**
1. [คำแนะนำที่ 1]
2. [คำแนะนำที่ 2]

### 🔍 Insights เชิงลึก (Deep Insights)
[วิเคราะห์เชิงลึกเกี่ยวกับพฤติกรรม ความต้องการ และแรงจูงใจของผู้บริโภค]

### ⚠️ ความเสี่ยงและข้อควรระวัง (Risks & Considerations)
[ระบุความเสี่ยงและข้อควรระวังที่สำคัญ]

---

จงเขียนเป็นภาษาไทยที่เป็นทางการแต่อ่านง่าย เน้นความเป็นมืออาชีพ และให้ข้อมูลที่ actionable
ความยาวประมาณ 600-800 คำ"""



        messages = [
            {"role": "system", "content": "You are a senior consumer insights analyst specializing in FMCG products. Provide strategic, data-driven executive summaries in Thai."},
            {"role": "user", "content": f"{context}\n\n{prompt}"}
        ]
        
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=messages,
            temperature=0.4,
            max_tokens=2500
        )
        
        summary = response.choices[0].message.content.strip()
        
        # Extract key findings from summary for structured display
        key_findings = extract_key_findings(summary)
        
        return {
            "success": True,
            "summary": summary,
            "key_findings": key_findings,
            "data_context": {
                "total_interviews": demographics.get('total_interviews', 0),
                "avg_age": round(demographics.get('avg_age', 0), 1) if demographics.get('avg_age') else 0,
                "top_positive_themes": [t.get('theme_name_th', 'Unknown') for t in top_positive_themes[:3]],
                "top_concerns": [t.get('theme_name_th', 'Unknown') for t in top_negative_themes[:3]],
                "top_brands": [b.get('brand_name', 'Unknown') for b in brand_data[:3]]
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "summary": f"Error generating executive summary: {str(e)}",
            "data_context": None
        }

@router.get("/theme-sentiment-insights")
def get_theme_sentiment_insights():
    """
    Generate AI insights for top positive and negative themes with sample quotes
    """
    try:
        # Get top positive themes with quotes
        positive_themes = execute_query("""
            SELECT 
                t.theme_name_th,
                t.theme_name_en,
                COUNT(*) as mention_count,
                GROUP_CONCAT(it.quote_sample, ' | ') as sample_quotes
            FROM interview_themes it
            JOIN themes t ON it.theme_id = t.theme_id
            WHERE it.sentiment = 'Positive' AND it.quote_sample IS NOT NULL AND it.quote_sample != ''
            GROUP BY t.theme_id
            ORDER BY mention_count DESC
            LIMIT 3
        """)
        
        # Get top negative/mixed themes with quotes
        negative_themes = execute_query("""
            SELECT 
                t.theme_name_th,
                t.theme_name_en,
                COUNT(*) as mention_count,
                GROUP_CONCAT(it.quote_sample, ' | ') as sample_quotes
            FROM interview_themes it
            JOIN themes t ON it.theme_id = t.theme_id
            WHERE it.sentiment IN ('Negative', 'Mixed') AND it.quote_sample IS NOT NULL AND it.quote_sample != ''
            GROUP BY t.theme_id
            ORDER BY mention_count DESC
            LIMIT 3
        """)
        
        # Prepare context for AI
        positive_context = ""
        for theme in positive_themes:
            quotes = theme.get('sample_quotes', '').split(' | ')[:3]  # Get first 3 quotes
            positive_context += f"\n{theme.get('theme_name_th', 'Unknown')} ({theme.get('mention_count', 0)} mentions):\n"
            for i, quote in enumerate(quotes, 1):
                if quote.strip():
                    positive_context += f"  {i}. \"{quote.strip()[:150]}...\"\n"
        
        negative_context = ""
        for theme in negative_themes:
            quotes = theme.get('sample_quotes', '').split(' | ')[:3]
            negative_context += f"\n{theme.get('theme_name_th', 'Unknown')} ({theme.get('mention_count', 0)} mentions):\n"
            for i, quote in enumerate(quotes, 1):
                if quote.strip():
                    negative_context += f"  {i}. \"{quote.strip()[:150]}...\"\n"
        
        # Generate insights with AI
        prompt = f"""วิเคราะห์ข้อมูลธีมจากการสัมภาษณ์เกี่ยวกับน้ำยาล้างจาน และสรุป insights สั้นๆ

TOP POSITIVE DRIVERS:
{positive_context}

TOP CONCERNS (Mixed/Negative):
{negative_context}

สำหรับแต่ละธีม ให้วิเคราะห์และสรุปเป็น insight สั้นๆ (1-2 ประโยค) ที่อธิบายว่า:
- ผู้บริโภคคิดอย่างไร
- ทำไมถึงสำคัญ
- มีโอกาสอะไร (สำหรับ positive) หรือความเสี่ยงอะไร (สำหรับ negative)

ตอบในรูปแบบ JSON:
{{
  "positive_insights": [
    {{"theme": "ชื่อธีม", "insight": "คำอธิบาย insight"}},
    ...
  ],
  "negative_insights": [
    {{"theme": "ชื่อธีม", "insight": "คำอธิบาย insight"}},
    ...
  ]
}}

ให้ insight เป็นภาษาไทย กระชับ เข้าใจง่าย และ actionable"""

        messages = [
            {"role": "system", "content": "You are a consumer insights analyst. Provide concise, actionable insights in Thai. Return only valid JSON."},
            {"role": "user", "content": prompt}
        ]
        
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        
        insights_json = response.choices[0].message.content.strip()
        import json
        insights = json.loads(insights_json)
        
        # Combine with theme data
        positive_result = []
        for i, theme in enumerate(positive_themes):
            insight_data = insights.get('positive_insights', [])[i] if i < len(insights.get('positive_insights', [])) else {}
            quotes = theme.get('sample_quotes', '').split(' | ')[:2]
            positive_result.append({
                "theme_name": theme.get('theme_name_th', 'Unknown'),
                "mention_count": theme.get('mention_count', 0),
                "insight": insight_data.get('insight', 'Core functional requirement.'),
                "sample_quotes": [q.strip() for q in quotes if q.strip()]
            })
        
        negative_result = []
        for i, theme in enumerate(negative_themes):
            insight_data = insights.get('negative_insights', [])[i] if i < len(insights.get('negative_insights', [])) else {}
            quotes = theme.get('sample_quotes', '').split(' | ')[:2]
            negative_result.append({
                "theme_name": theme.get('theme_name_th', 'Unknown'),
                "mention_count": theme.get('mention_count', 0),
                "insight": insight_data.get('insight', 'Primary area of concern.'),
                "sample_quotes": [q.strip() for q in quotes if q.strip()]
            })
        
        return {
            "success": True,
            "positive_drivers": positive_result,
            "top_concerns": negative_result
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "positive_drivers": [],
            "top_concerns": []
        }
