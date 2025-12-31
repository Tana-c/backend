#!/usr/bin/env python3
"""
Script to remove citation patterns from JSON data.
Removes [cite: xxx] and [cite_start] patterns from all text fields.
"""

import json
import re
import os

def clean_citations(text):
    """
    Remove citation patterns from text.
    Patterns to remove:
    - [cite: xxx] where xxx is any number
    - [cite_start]
    """
    if not isinstance(text, str):
        return text
    
    # Remove [cite: number] patterns
    text = re.sub(r'\[cite:\s*\d+\]', '', text)
    
    # Remove [cite_start] patterns
    text = re.sub(r'\[cite_start\]', '', text)
    
    # Clean up any extra spaces that might be left
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    return text

def clean_json_recursively(obj):
    """
    Recursively clean citation patterns from JSON object.
    """
    if isinstance(obj, dict):
        return {key: clean_json_recursively(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [clean_json_recursively(item) for item in obj]
    elif isinstance(obj, str):
        return clean_citations(obj)
    else:
        return obj

def main():
    input_file = "data.json"
    output_file = "data_clean.json"
    
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found!")
        return
    
    try:
        # Read the file as text first to clean citations before parsing
        print(f"Loading {input_file} as text...")
        with open(input_file, 'r', encoding='utf-8') as f:
            raw_text = f.read()
        
        # Clean citation patterns from the raw text
        print("Cleaning citation patterns from raw text...")
        cleaned_text = clean_citations(raw_text)
        
        # Now try to parse the cleaned JSON
        print("Parsing cleaned JSON...")
        try:
            data = json.loads(cleaned_text)
        except json.JSONDecodeError as e:
            print(f"❌ Still have JSON parsing error after cleaning: {e}")
            print("Trying to fix common JSON issues...")
            
            # Fix common JSON issues
            cleaned_text = re.sub(r',\s*}', '}', cleaned_text)  # Remove trailing commas before }
            cleaned_text = re.sub(r',\s*]', ']', cleaned_text)  # Remove trailing commas before ]
            
            # Try parsing again
            data = json.loads(cleaned_text)
        
        # Apply recursive cleaning to the parsed data (in case we missed anything)
        print("Applying final cleanup...")
        cleaned_data = clean_json_recursively(data)
        
        # Save the cleaned data
        print(f"Saving cleaned data to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Successfully cleaned citations and saved to {output_file}")
        
        # Show some statistics
        cite_count = len(re.findall(r'\[cite[:\s_][^\]]*\]', raw_text))
        print(f"📊 Removed {cite_count} citation patterns")
        print(f"📊 Original size: {len(raw_text):,} characters")
        print(f"📊 Cleaned size: {len(cleaned_text):,} characters")
        
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        print(f"Error at line {e.lineno}, column {e.colno}")
        # Show context around the error
        lines = cleaned_text.split('\n')
        if e.lineno <= len(lines):
            start = max(0, e.lineno - 3)
            end = min(len(lines), e.lineno + 2)
            print("Context around error:")
            for i in range(start, end):
                marker = " --> " if i == e.lineno - 1 else "     "
                print(f"{marker}Line {i+1}: {lines[i]}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
