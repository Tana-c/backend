/**
 * API Service for Interview Data
 * Connects to FastAPI backend
 */

import { API_BASE_URL } from '../config';

/**
 * Fetch all interviews
 */
export const fetchInterviews = async () => {
  const response = await fetch(`${API_BASE_URL}/interviews`);
  if (!response.ok) throw new Error('Failed to fetch interviews');
  return response.json();
};

/**
 * Fetch interview detail with persona, transcript, brands, themes
 */
export const fetchInterviewDetail = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/interviews/${interviewId}`);
  if (!response.ok) throw new Error(`Failed to fetch interview ${interviewId}`);
  return response.json();
};

/**
 * Fetch all personas
 */
export const fetchPersonas = async () => {
  const response = await fetch(`${API_BASE_URL}/personas`);
  if (!response.ok) throw new Error('Failed to fetch personas');
  return response.json();
};

/**
 * Fetch all segments
 */
export const fetchSegments = async () => {
  const response = await fetch(`${API_BASE_URL}/segments`);
  if (!response.ok) throw new Error('Failed to fetch segments');
  return response.json();
};

/**
 * Fetch all brands
 */
export const fetchBrands = async () => {
  const response = await fetch(`${API_BASE_URL}/brands`);
  if (!response.ok) throw new Error('Failed to fetch brands');
  return response.json();
};

/**
 * Fetch brand detail with perceptions
 */
export const fetchBrandDetail = async (brandId) => {
  const response = await fetch(`${API_BASE_URL}/brands/${brandId}`);
  if (!response.ok) throw new Error(`Failed to fetch brand ${brandId}`);
  return response.json();
};

/**
 * Fetch all themes
 */
export const fetchThemes = async () => {
  const response = await fetch(`${API_BASE_URL}/themes`);
  if (!response.ok) throw new Error('Failed to fetch themes');
  return response.json();
};

/**
 * Fetch theme insights
 */
export const fetchThemeInsights = async (themeId) => {
  const response = await fetch(`${API_BASE_URL}/themes/${themeId}`);
  if (!response.ok) throw new Error(`Failed to fetch theme ${themeId}`);
  return response.json();
};

/**
 * Fetch transcript for an interview
 */
export const fetchTranscript = async (interviewId) => {
  const response = await fetch(`${API_BASE_URL}/transcripts/${interviewId}`);
  if (!response.ok) throw new Error(`Failed to fetch transcript for ${interviewId}`);
  return response.json();
};

/**
 * Search transcripts
 */
export const searchTranscripts = async (query, interviewId = null) => {
  const url = new URL(`${API_BASE_URL}/transcripts/search/text`);
  url.searchParams.append('q', query);
  if (interviewId) url.searchParams.append('interview_id', interviewId);
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to search transcripts');
  return response.json();
};

/**
 * Fetch analytics summary
 */
export const fetchAnalyticsSummary = async () => {
  const response = await fetch(`${API_BASE_URL}/analytics/summary`);
  if (!response.ok) throw new Error('Failed to fetch analytics summary');
  return response.json();
};

/**
 * Fetch themes table with examples
 */
export const fetchThemesTable = async () => {
  const response = await fetch(`${API_BASE_URL}/themes/table/all`);
  if (!response.ok) throw new Error('Failed to fetch themes table');
  return response.json();
};

/**
 * Fetch theme insights by sentiment (positive/negative)
 */
export const fetchThemeInsightsBySentiment = async () => {
  const response = await fetch(`${API_BASE_URL}/themes/insights/sentiment`);
  if (!response.ok) throw new Error('Failed to fetch theme insights');
  return response.json();
};

/**
 * Transform API data to dashboard format
 */
export const transformDataForDashboard = async () => {
  try {
    // Fetch all necessary data
    const [interviews, personas, brands, analytics] = await Promise.all([
      fetchInterviews(),
      fetchPersonas(),
      fetchBrands(),
      fetchAnalyticsSummary()
    ]);

    // Transform insights data - using Thai language fields from database
    // Fields are updated with Thai translations via translate_personas_to_thai.sql
    // role, key_drivers, constraints, usage_pattern, environment are all in Thai
    const insightsData = personas.map(persona => ({
      id: persona.interview_id,
      role: persona.role || 'Unknown', // Thai: อาชีพ/บทบาท
      want: persona.key_drivers || 'N/A', // Thai: key_drivers - ความต้องการ/แรงจูงใจหลัก
      but: persona.constraints || 'N/A', // Thai: constraints - ข้อจำกัด
      so: persona.usage_pattern || persona.environment || 'N/A' // Thai: usage_pattern/environment - รูปแบบการใช้งาน/สภาพแวดล้อม
    }));

    // Transform brand data for pie chart
    const brandData = analytics.brand_mentions.map((brand, index) => ({
      name: brand.brand_name,
      value: brand.interview_count,
      color: ['#FFD700', '#FF6347', '#4CAF50', '#2196F3'][index] || '#9E9E9E'
    }));

    // Transform themes data (use top themes from analytics)
    const themesData = analytics.top_themes.slice(0, 9).map(theme => ({
      name: theme.theme_name_th,
      total: theme.mention_count,
      Positive: Math.floor(theme.mention_count * 0.5),
      Mixed: Math.floor(theme.mention_count * 0.3),
      Negative: Math.floor(theme.mention_count * 0.1),
      Neutral: Math.floor(theme.mention_count * 0.1)
    }));

    return {
      insightsData,
      brandData,
      themesData,
      interviews,
      personas,
      brands,
      analytics
    };
  } catch (error) {
    console.error('Error transforming data:', error);
    throw error;
  }
};
