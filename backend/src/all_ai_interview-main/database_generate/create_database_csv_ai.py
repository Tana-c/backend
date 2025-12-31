#!/usr/bin/env python3
"""
Create CSV files from interview JSON data using AI-powered extraction.
Uses OpenAI API for more accurate brand, theme, and sentiment analysis.
"""

import json
import pandas as pd
from datetime import datetime
from collections import defaultdict
from ai_extraction import (
    extract_brands_with_ai,
    extract_themes_with_ai,
    determine_sentiment_with_ai
)

def main():
    # Load cleaned JSON data
    print("Loading data_clean.json...")
    with open('data_clean.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    interviews_data = data.get('interviews', [])
    print(f"Found {len(interviews_data)} interviews")
    print("Using AI-powered extraction (OpenAI API)\n")
    
    # Initialize data structures
    segments_list = []
    interviews_list = []
    personas_list = []
    transcript_lines_list = []
    brands_set = set()
    interview_brands_list = []
    brand_perceptions_list = []
    themes_set = set()
    interview_themes_list = []
    purchase_behaviors_list = []
    
    segment_map = {}
    segment_id_counter = 1
    transcript_id_counter = 1
    
    # Process each interview
    for idx, interview in enumerate(interviews_data, 1):
        print(f"Processing interview {idx}/{len(interviews_data)}: {interview.get('id', 'N/A')}")
        
        interview_id = interview.get('id', '')
        segment = interview.get('segment', '')
        key_focus = interview.get('key_focus', '')
        topic = interview.get('topic', '')
        persona = interview.get('persona', {})
        transcript = interview.get('transcript', [])
        
        # 1. SEGMENTS
        if segment not in segment_map:
            segment_map[segment] = segment_id_counter
            segments_list.append({
                'segment_id': segment_id_counter,
                'segment_name_th': segment,
                'segment_name_en': '',
                'key_focus': key_focus,
                'description': '',
                'created_at': datetime.now().isoformat()
            })
            segment_id_counter += 1
        
        current_segment_id = segment_map[segment]
        
        # 2. INTERVIEWS
        interviews_list.append({
            'interview_id': interview_id,
            'segment_id': current_segment_id,
            'topic': topic,
            'interview_date': datetime.now().date().isoformat(),
            'interview_duration_minutes': None,
            'location': '',
            'interviewer_name': '',
            'status': 'completed',
            'notes': '',
            'created_at': datetime.now().isoformat()
        })
        
        # 3. PERSONAS
        features = persona.get('features', {})
        personas_list.append({
            'interview_id': interview_id,
            'description_th': persona.get('description', ''),
            'description_en': '',
            'role': features.get('role', ''),
            'age': features.get('age', None),
            'gender': None,
            'environment': features.get('environment', ''),
            'usage_pattern': features.get('usage_pattern', ''),
            'key_drivers': features.get('key_drivers', ''),
            'constraints': features.get('constraints', ''),
            'income_level': None,
            'education_level': None,
            'household_size': None,
            'created_at': datetime.now().isoformat()
        })
        
        # 4. TRANSCRIPT LINES with AI extraction
        brands_mentioned = defaultdict(int)
        themes_mentioned = defaultdict(list)
        brand_perceptions = defaultdict(lambda: defaultdict(list))
        
        for turn_num, turn in enumerate(transcript, start=1):
            speaker = turn.get('speaker', '')
            text = turn.get('text', '')
            
            transcript_lines_list.append({
                'transcript_id': transcript_id_counter,
                'interview_id': interview_id,
                'turn_number': turn_num,
                'speaker': speaker,
                'text': text,
                'timestamp_seconds': None,
                'language': 'th',
                'created_at': datetime.now().isoformat()
            })
            
            # AI-powered extraction from respondent answers
            if speaker == 'Respondent' and len(text.strip()) > 10:
                print(f"  Analyzing turn {turn_num}...")
                
                # Extract brands using AI
                brands = extract_brands_with_ai(text)
                for brand in brands:
                    brands_set.add(brand)
                    brands_mentioned[brand] += 1
                
                # Extract themes using AI
                themes = extract_themes_with_ai(text)
                for theme_obj in themes:
                    theme_name = theme_obj.get('name', '')
                    theme_category = theme_obj.get('category', '')
                    
                    if theme_name:
                        themes_set.add(theme_name)
                        
                        # Determine sentiment using AI
                        sentiment, confidence, reasoning = determine_sentiment_with_ai(
                            text, 
                            context=theme_name
                        )
                        
                        themes_mentioned[theme_name].append({
                            'sentiment': sentiment,
                            'confidence': confidence,
                            'reasoning': reasoning,
                            'quote': text[:200],
                            'turn_number': turn_num,
                            'transcript_id': transcript_id_counter,
                            'category': theme_category
                        })
                        
                        # If brand is mentioned with theme, create brand perception
                        for brand in brands:
                            brand_perceptions[brand][theme_name].append({
                                'sentiment': sentiment,
                                'quote': text[:200],
                                'transcript_id': transcript_id_counter
                            })
            
            transcript_id_counter += 1
        
        # 5. INTERVIEW_BRANDS
        for brand, count in brands_mentioned.items():
            interview_brands_list.append({
                'interview_id': interview_id,
                'brand_name': brand,
                'currently_using': count > 2,
                'has_used_before': True,
                'awareness_level': 'High' if count > 3 else 'Medium',
                'purchase_frequency': None,
                'satisfaction_score': None,
                'mentioned_count': count,
                'notes': ''
            })
        
        # 6. BRAND_PERCEPTIONS
        for brand, perceptions in brand_perceptions.items():
            for theme, occurrences in perceptions.items():
                for occ in occurrences:
                    brand_perceptions_list.append({
                        'interview_id': interview_id,
                        'brand_name': brand,
                        'perception_category': theme,
                        'perception_value': occ['quote'][:100],
                        'sentiment': occ['sentiment'],
                        'quote': occ['quote'],
                        'transcript_id': occ['transcript_id'],
                        'created_at': datetime.now().isoformat()
                    })
        
        # 7. INTERVIEW_THEMES
        for theme, occurrences in themes_mentioned.items():
            for occ in occurrences:
                interview_themes_list.append({
                    'interview_id': interview_id,
                    'theme_name': theme,
                    'theme_category': occ.get('category', ''),
                    'sentiment': occ['sentiment'],
                    'confidence': occ['confidence'],
                    'importance_level': 'High' if len(occurrences) > 2 else 'Medium',
                    'quote_sample': occ['quote'],
                    'turn_number': occ['turn_number'],
                    'transcript_id': occ['transcript_id'],
                    'reasoning': occ.get('reasoning', ''),
                    'analyst_notes': '',
                    'created_at': datetime.now().isoformat()
                })
        
        # 8. PURCHASE_BEHAVIORS (simple extraction)
        purchase_locations = []
        full_transcript = ' '.join([t.get('text', '') for t in transcript if t.get('speaker') == 'Respondent'])
        
        import re
        if re.search(r'7-11|เซเว่น', full_transcript, re.IGNORECASE):
            purchase_locations.append('7-11')
        if re.search(r'Shopee|ช้อปปี้', full_transcript, re.IGNORECASE):
            purchase_locations.append('Shopee')
        if re.search(r'Makro|แม็คโคร', full_transcript, re.IGNORECASE):
            purchase_locations.append('Makro')
        if re.search(r'Lotus|โลตัส', full_transcript, re.IGNORECASE):
            purchase_locations.append('Lotus')
        
        purchase_behaviors_list.append({
            'interview_id': interview_id,
            'purchase_location': ', '.join(purchase_locations) if purchase_locations else None,
            'purchase_frequency': None,
            'typical_package_size': None,
            'price_sensitivity': 'High' if re.search(r'ราคา|แพง|ถูก|คุ้ม', full_transcript) else 'Medium',
            'brand_loyalty': None,
            'primary_decision_factor': None,
            'willing_to_pay_premium': None,
            'bulk_buyer': bool(re.search(r'ยกลัง|แกลลอน|bulk', full_transcript, re.IGNORECASE)),
            'online_vs_offline': 'Mixed' if purchase_locations else None,
            'notes': '',
            'created_at': datetime.now().isoformat()
        })
        
        print(f"  ✓ Extracted {len(brands_mentioned)} brands, {len(themes_mentioned)} themes\n")
    
    # Create DataFrames and save to CSV
    print("\n" + "="*60)
    print("Creating CSV files...")
    print("="*60 + "\n")
    
    # 1. segments.csv
    df_segments = pd.DataFrame(segments_list)
    df_segments.to_csv('segments_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ segments_ai.csv ({len(df_segments)} rows)")
    
    # 2. interviews.csv
    df_interviews = pd.DataFrame(interviews_list)
    df_interviews.to_csv('interviews_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ interviews_ai.csv ({len(df_interviews)} rows)")
    
    # 3. personas.csv
    df_personas = pd.DataFrame(personas_list)
    df_personas.to_csv('personas_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ personas_ai.csv ({len(df_personas)} rows)")
    
    # 4. transcript_lines.csv
    df_transcript = pd.DataFrame(transcript_lines_list)
    df_transcript.to_csv('transcript_lines_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ transcript_lines_ai.csv ({len(df_transcript)} rows)")
    
    # 5. brands.csv (master list)
    brands_list = []
    brand_id_map = {}
    for idx, brand in enumerate(sorted(brands_set), start=1):
        brand_id_map[brand] = idx
        brands_list.append({
            'brand_id': idx,
            'brand_name': brand,
            'brand_name_th': brand,
            'manufacturer': '',
            'brand_type': 'Mass Market' if brand in ['Sunlight', 'LiponF'] else 'Organic',
            'market_position': '',
            'website': '',
            'description': '',
            'created_at': datetime.now().isoformat()
        })
    
    df_brands = pd.DataFrame(brands_list)
    df_brands.to_csv('brands_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ brands_ai.csv ({len(df_brands)} rows)")
    
    # 6. interview_brands.csv (add brand_id)
    for item in interview_brands_list:
        item['brand_id'] = brand_id_map.get(item['brand_name'], None)
    
    df_interview_brands = pd.DataFrame(interview_brands_list)
    df_interview_brands.to_csv('interview_brands_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ interview_brands_ai.csv ({len(df_interview_brands)} rows)")
    
    # 7. brand_perceptions.csv (add brand_id)
    for item in brand_perceptions_list:
        item['brand_id'] = brand_id_map.get(item['brand_name'], None)
    
    df_brand_perceptions = pd.DataFrame(brand_perceptions_list)
    df_brand_perceptions.to_csv('brand_perceptions_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ brand_perceptions_ai.csv ({len(df_brand_perceptions)} rows)")
    
    # 8. themes.csv (master list)
    themes_list = []
    theme_id_map = {}
    for idx, theme in enumerate(sorted(themes_set), start=1):
        theme_id_map[theme] = idx
        themes_list.append({
            'theme_id': idx,
            'theme_name_th': theme,
            'theme_name_en': '',
            'category': '',
            'description': '',
            'parent_theme_id': None,
            'created_at': datetime.now().isoformat()
        })
    
    df_themes = pd.DataFrame(themes_list)
    df_themes.to_csv('themes_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ themes_ai.csv ({len(df_themes)} rows)")
    
    # 9. interview_themes.csv (add theme_id and category)
    for item in interview_themes_list:
        item['theme_id'] = theme_id_map.get(item['theme_name'], None)
    
    df_interview_themes = pd.DataFrame(interview_themes_list)
    df_interview_themes.to_csv('interview_themes_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ interview_themes_ai.csv ({len(df_interview_themes)} rows)")
    
    # 10. purchase_behaviors.csv
    df_purchase = pd.DataFrame(purchase_behaviors_list)
    df_purchase.to_csv('purchase_behaviors_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ purchase_behaviors_ai.csv ({len(df_purchase)} rows)")
    
    # 11. product_attributes.csv (predefined attributes)
    attributes_list = [
        {'attribute_id': 1, 'attribute_name_th': 'กลิ่นหอม', 'attribute_name_en': 'Pleasant Scent', 'attribute_category': 'Sensory'},
        {'attribute_id': 2, 'attribute_name_th': 'ขจัดคราบมัน', 'attribute_name_en': 'Grease Removal', 'attribute_category': 'Performance'},
        {'attribute_id': 3, 'attribute_name_th': 'มือไม่แห้ง', 'attribute_name_en': 'Gentle on Hands', 'attribute_category': 'Safety'},
        {'attribute_id': 4, 'attribute_name_th': 'ล้างออกง่าย', 'attribute_name_en': 'Easy Rinse', 'attribute_category': 'Convenience'},
        {'attribute_id': 5, 'attribute_name_th': 'ฟองน้อย', 'attribute_name_en': 'Low Foam', 'attribute_category': 'Performance'},
        {'attribute_id': 6, 'attribute_name_th': 'คุ้มค่า', 'attribute_name_en': 'Value for Money', 'attribute_category': 'Value'},
        {'attribute_id': 7, 'attribute_name_th': 'เป็นมิตรต่อสิ่งแวดล้อม', 'attribute_name_en': 'Eco-friendly', 'attribute_category': 'Environmental'},
        {'attribute_id': 8, 'attribute_name_th': 'ราคา', 'attribute_name_en': 'Price', 'attribute_category': 'Value'},
        {'attribute_id': 9, 'attribute_name_th': 'แพ็กเกจ', 'attribute_name_en': 'Packaging', 'attribute_category': 'Convenience'}
    ]
    
    df_attributes = pd.DataFrame(attributes_list)
    df_attributes.to_csv('product_attributes_ai.csv', index=False, encoding='utf-8-sig')
    print(f"✅ product_attributes_ai.csv ({len(df_attributes)} rows)")
    
    print("\n" + "="*60)
    print("📊 AI-Powered Extraction Summary:")
    print("="*60)
    print(f"  - {len(df_segments)} segments")
    print(f"  - {len(df_interviews)} interviews")
    print(f"  - {len(df_personas)} personas")
    print(f"  - {len(df_transcript)} transcript lines")
    print(f"  - {len(df_brands)} brands (AI-extracted)")
    print(f"  - {len(df_interview_brands)} interview-brand relationships")
    print(f"  - {len(df_brand_perceptions)} brand perceptions (NEW)")
    print(f"  - {len(df_themes)} themes (AI-extracted)")
    print(f"  - {len(df_interview_themes)} interview-theme relationships (with confidence)")
    print(f"  - {len(df_purchase)} purchase behaviors")
    print(f"  - {len(df_attributes)} product attributes")
    print("="*60)
    print("\n✅ All AI-powered CSV files created successfully!")
    print("📁 Files saved with '_ai' suffix to distinguish from regex-based extraction")

if __name__ == "__main__":
    main()
