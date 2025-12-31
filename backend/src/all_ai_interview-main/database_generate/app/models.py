"""
Pydantic Models for API
"""

from pydantic import BaseModel
from typing import Optional

class Segment(BaseModel):
    segment_id: int
    segment_name_th: Optional[str] = None
    segment_name_en: Optional[str] = None
    key_focus: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None

class Interview(BaseModel):
    interview_id: str
    segment_id: Optional[int] = None
    topic: Optional[str] = None
    interview_date: Optional[str] = None
    interview_duration_minutes: Optional[int] = None
    location: Optional[str] = None
    interviewer_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None

class Persona(BaseModel):
    interview_id: str
    description_th: Optional[str] = None
    description_en: Optional[str] = None
    role: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    environment: Optional[str] = None
    usage_pattern: Optional[str] = None
    key_drivers: Optional[str] = None
    constraints: Optional[str] = None
    income_level: Optional[str] = None
    education_level: Optional[str] = None
    household_size: Optional[int] = None
    created_at: Optional[str] = None

class Brand(BaseModel):
    brand_id: int
    brand_name: str
    brand_name_th: Optional[str] = None
    manufacturer: Optional[str] = None
    brand_type: Optional[str] = None
    market_position: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    created_at: Optional[str] = None

class Theme(BaseModel):
    theme_id: int
    theme_name_th: Optional[str] = None
    theme_name_en: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    parent_theme_id: Optional[int] = None
    created_at: Optional[str] = None

class TranscriptLine(BaseModel):
    transcript_id: int
    interview_id: str
    turn_number: int
    speaker: str
    text: str
    timestamp_seconds: Optional[float] = None
    language: Optional[str] = None
    created_at: Optional[str] = None

class BrandPerception(BaseModel):
    id: int
    interview_id: str
    brand_name: Optional[str] = None
    perception_category: Optional[str] = None
    perception_value: Optional[str] = None
    sentiment: Optional[str] = None
    quote: Optional[str] = None
    transcript_id: Optional[int] = None
    created_at: Optional[str] = None
    brand_id: Optional[int] = None

class InterviewTheme(BaseModel):
    id: int
    interview_id: str
    theme_name: Optional[str] = None
    theme_category: Optional[str] = None
    sentiment: Optional[str] = None
    confidence: Optional[float] = None
    importance_level: Optional[str] = None
    quote_sample: Optional[str] = None
    turn_number: Optional[int] = None
    transcript_id: Optional[int] = None
    reasoning: Optional[str] = None
    analyst_notes: Optional[str] = None
    created_at: Optional[str] = None
    theme_id: Optional[int] = None

class PurchaseBehavior(BaseModel):
    id: int
    interview_id: str
    purchase_location: Optional[str] = None
    purchase_frequency: Optional[str] = None
    typical_package_size: Optional[str] = None
    price_sensitivity: Optional[str] = None
    brand_loyalty: Optional[str] = None
    primary_decision_factor: Optional[str] = None
    willing_to_pay_premium: Optional[str] = None
    bulk_buyer: Optional[int] = None
    online_vs_offline: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
