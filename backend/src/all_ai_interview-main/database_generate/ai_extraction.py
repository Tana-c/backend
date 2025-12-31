#!/usr/bin/env python3
"""
AI-powered extraction functions using OpenAI API.
Provides more accurate brand, theme, and sentiment extraction compared to regex.
"""

import os
import json
import openai
from typing import List, Dict, Tuple
import re

# Set up OpenAI API key
#load environment key


API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = API_KEY


def extract_brands_with_ai(text: str) -> List[str]:
    """
    Extract brand mentions from text using OpenAI API.
    
    Args:
        text: Text to analyze
        
    Returns:
        List of brand names mentioned
    """
    if not text or len(text.strip()) < 10:
        return []
    
    prompt = f"""วิเคราะห์ข้อความต่อไปนี้และระบุแบรนด์น้ำยาล้างจานที่ถูกกล่าวถึง

ข้อความ: "{text}"

แบรนด์ที่เป็นไปได้:
- Sunlight (ซันไลท์)
- LiponF (ไลปอนเอฟ)
- Muji (มูจิ)
- แบรนด์ออร์แกนิก (Organic brands)
- แบรนด์อื่นๆ

ตอบกลับในรูปแบบ JSON:
{{
    "brands": ["brand1", "brand2"]
}}

หากไม่มีแบรนด์ใดถูกกล่าวถึง ให้ตอบ {{"brands": []}}"""

    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ข้อความเกี่ยวกับผลิตภัณฑ์น้ำยาล้างจาน ตอบกลับในรูปแบบ JSON เสมอ"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=200
        )
        
        result = json.loads(response.choices[0].message.content)
        brands = result.get("brands", [])
        
        # Normalize brand names
        normalized_brands = []
        for brand in brands:
            brand_lower = brand.lower()
            if 'sunlight' in brand_lower or 'ซันไลท์' in brand_lower:
                normalized_brands.append('Sunlight')
            elif 'lipon' in brand_lower or 'ไลปอน' in brand_lower:
                normalized_brands.append('LiponF')
            elif 'muji' in brand_lower or 'มูจิ' in brand_lower:
                normalized_brands.append('Muji')
            elif 'organic' in brand_lower or 'ออร์แกนิก' in brand_lower:
                normalized_brands.append('Organic')
            else:
                normalized_brands.append(brand)
        
        return list(set(normalized_brands))
        
    except Exception as e:
        print(f"⚠️  AI extraction failed for brands: {e}")
        # Fallback to regex
        return extract_brands_from_text_regex(text)


def extract_themes_with_ai(text: str) -> List[Dict[str, str]]:
    """
    Extract themes/topics from text using OpenAI API.
    
    Args:
        text: Text to analyze
        
    Returns:
        List of dicts with theme and category
    """
    if not text or len(text.strip()) < 10:
        return []
    
    prompt = f"""วิเคราะห์ข้อความต่อไปนี้และระบุธีม (themes) ที่เกี่ยวข้องกับน้ำยาล้างจาน

ข้อความ: "{text}"

ธีมที่เป็นไปได้:
- กลิ่นหอม (Pleasant Scent)
- ขจัดคราบมัน (Grease Removal)
- มือไม่แห้ง / อ่อนโยนต่อมือ (Gentle on Hands)
- ล้างออกง่าย (Easy Rinse)
- ฟอง (Foam Level)
- คุ้มค่า / ประหยัด (Value for Money)
- ปลอดภัย / ไม่มีสารตกค้าง (Safety / No Residue)
- ราคา (Price)
- แพ็กเกจ / ขวด / ดีไซน์ (Packaging / Design)
- สิ่งแวดล้อม (Environmental)

ตอบกลับในรูปแบบ JSON:
{{
    "themes": [
        {{"name": "กลิ่นหอม", "category": "Sensory"}},
        {{"name": "ราคา", "category": "Value"}}
    ]
}}

หากไม่มีธีมที่ชัดเจน ให้ตอบ {{"themes": []}}"""

    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ธีมจากข้อความเกี่ยวกับผลิตภัณฑ์ ตอบกลับในรูปแบบ JSON เสมอ"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=300
        )
        
        result = json.loads(response.choices[0].message.content)
        themes = result.get("themes", [])
        
        return themes
        
    except Exception as e:
        print(f"⚠️  AI extraction failed for themes: {e}")
        # Fallback to regex
        theme_names = extract_themes_from_text_regex(text)
        return [{"name": theme, "category": ""} for theme in theme_names]


def determine_sentiment_with_ai(text: str, context: str = "") -> Tuple[str, float, str]:
    """
    Determine sentiment from text using OpenAI API.
    
    Args:
        text: Text to analyze
        context: Optional context (e.g., theme being discussed)
        
    Returns:
        Tuple of (sentiment, confidence_score, reasoning)
    """
    if not text or len(text.strip()) < 5:
        return ("Neutral", 0.5, "Text too short")
    
    context_str = f"\nบริบท: {context}" if context else ""
    
    prompt = f"""วิเคราะห์ความรู้สึก (sentiment) จากข้อความต่อไปนี้{context_str}

ข้อความ: "{text}"

ระบุ:
1. ความรู้สึกโดยรวม: Positive, Negative, Neutral, หรือ Mixed
2. ระดับความมั่นใจ (0.0 - 1.0)
3. เหตุผล

ตอบกลับในรูปแบบ JSON:
{{
    "sentiment": "Positive",
    "confidence": 0.85,
    "reasoning": "ผู้ตอบแสดงความพึงพอใจต่อกลิ่นและความสะอาด"
}}"""

    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ความรู้สึกจากข้อความภาษาไทย ตอบกลับในรูปแบบ JSON เสมอ"},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=200
        )
        
        result = json.loads(response.choices[0].message.content)
        sentiment = result.get("sentiment", "Neutral")
        confidence = result.get("confidence", 0.5)
        reasoning = result.get("reasoning", "")
        
        # Normalize sentiment values
        sentiment_map = {
            "positive": "Positive",
            "negative": "Negative",
            "neutral": "Neutral",
            "mixed": "Mixed"
        }
        sentiment = sentiment_map.get(sentiment.lower(), sentiment)
        
        return (sentiment, confidence, reasoning)
        
    except Exception as e:
        print(f"⚠️  AI sentiment analysis failed: {e}")
        # Fallback to regex
        sentiment = determine_sentiment_regex(text)
        return (sentiment, 0.5, "Fallback to regex")


def analyze_text_batch(texts: List[str], analysis_type: str = "all") -> List[Dict]:
    """
    Batch analyze multiple texts for efficiency.
    
    Args:
        texts: List of texts to analyze
        analysis_type: "brands", "themes", "sentiment", or "all"
        
    Returns:
        List of analysis results
    """
    results = []
    
    for text in texts:
        result = {"text": text[:100]}
        
        if analysis_type in ["brands", "all"]:
            result["brands"] = extract_brands_with_ai(text)
        
        if analysis_type in ["themes", "all"]:
            result["themes"] = extract_themes_with_ai(text)
        
        if analysis_type in ["sentiment", "all"]:
            sentiment, confidence, reasoning = determine_sentiment_with_ai(text)
            result["sentiment"] = sentiment
            result["confidence"] = confidence
            result["reasoning"] = reasoning
        
        results.append(result)
    
    return results


# Fallback regex functions (same as original)
def extract_brands_from_text_regex(text: str) -> List[str]:
    """Fallback regex-based brand extraction."""
    brands = []
    brand_patterns = {
        'Sunlight': r'Sunlight|ซันไลท์',
        'LiponF': r'LiponF|ไลปอนเอฟ|Lipon\s*F',
        'Muji': r'Muji|มูจิ',
        'Organic': r'ออร์แกนิก|organic'
    }
    
    for brand, pattern in brand_patterns.items():
        if re.search(pattern, text, re.IGNORECASE):
            brands.append(brand)
    
    return brands


def extract_themes_from_text_regex(text: str) -> List[str]:
    """Fallback regex-based theme extraction."""
    themes = []
    theme_patterns = {
        'กลิ่นหอม': r'กลิ่น.*หอม|หอม.*กลิ่น|pleasant.*scent|scent',
        'ขจัดคราบมัน': r'ล้างมัน|คราบมัน|grease|ขจัด',
        'มือไม่แห้ง': r'มือแห้ง|มือ.*แห้ง|gentle.*hand|hand.*dry',
        'ล้างออกง่าย': r'ล้างออกง่าย|ล้างง่าย|easy.*rinse|rinse.*easy',
        'ฟอง': r'ฟอง|foam|bubble',
        'คุ้มค่า': r'คุ้ม|ประหยัด|value|worth',
        'ปลอดภัย': r'ปลอดภัย|สารตกค้าง|safe|residue',
        'ราคา': r'ราคา|price|แพง|ถูก',
        'แพ็กเกจ': r'ขวด|แพ็ก|package|bottle|ดีไซน์'
    }
    
    for theme, pattern in theme_patterns.items():
        if re.search(pattern, text, re.IGNORECASE):
            themes.append(theme)
    
    return themes


def determine_sentiment_regex(text: str) -> str:
    """Fallback regex-based sentiment analysis."""
    positive_words = r'ชอบ|ดี|หอม|สะอาด|สบาย|มั่นใจ|พอใจ|ประทับใจ|good|like|love|great|excellent'
    negative_words = r'ไม่ชอบ|แรง|แพง|ไม่ดี|ลำบาก|ยาก|bad|dislike|expensive|difficult'
    
    has_positive = bool(re.search(positive_words, text, re.IGNORECASE))
    has_negative = bool(re.search(negative_words, text, re.IGNORECASE))
    
    if has_positive and has_negative:
        return 'Mixed'
    elif has_positive:
        return 'Positive'
    elif has_negative:
        return 'Negative'
    else:
        return 'Neutral'


# Test function
def test_extraction():
    """Test the AI extraction functions."""
    test_text = "ผมใช้ Sunlight ครับ กลิ่นหอมดี ล้างมันออกง่าย แต่ราคาแพงไปนิด LiponF ก็เคยลอง ล้างดีแต่มือแห้ง"
    
    print("Testing AI Extraction:")
    print("="*60)
    print(f"Text: {test_text}\n")
    
    print("1. Brands:")
    brands = extract_brands_with_ai(test_text)
    print(f"   {brands}\n")
    
    print("2. Themes:")
    themes = extract_themes_with_ai(test_text)
    for theme in themes:
        print(f"   - {theme['name']} ({theme.get('category', 'N/A')})")
    print()
    
    print("3. Sentiment:")
    sentiment, confidence, reasoning = determine_sentiment_with_ai(test_text)
    print(f"   Sentiment: {sentiment}")
    print(f"   Confidence: {confidence:.2f}")
    print(f"   Reasoning: {reasoning}")
    print("="*60)


if __name__ == "__main__":
    test_extraction()
