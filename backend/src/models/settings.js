import pool from '../database.js'

export const getAIPromptSettings = async () => {
  const result = await pool.query(`
    SELECT 
      id, demographic_prompt, interview_prompt, insight_prompt, chat_ai_prompt,
      created_at, updated_at
    FROM ai_prompt_settings
    ORDER BY updated_at DESC
    LIMIT 1
  `)

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    demographicPrompt: row.demographic_prompt,
    interviewPrompt: row.interview_prompt,
    insightPrompt: row.insight_prompt,
    chatAIPrompt: row.chat_ai_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const saveAIPromptSettings = async (settings) => {
  // Check if settings exist
  const existing = await pool.query('SELECT id FROM ai_prompt_settings ORDER BY updated_at DESC LIMIT 1')
  
  if (existing.rows.length > 0) {
    // Update existing
    const result = await pool.query(`
      UPDATE ai_prompt_settings SET
        demographic_prompt = $1,
        interview_prompt = $2,
        insight_prompt = $3,
        chat_ai_prompt = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `, [
      settings.demographicPrompt,
      settings.interviewPrompt,
      settings.insightPrompt,
      settings.chatAIPrompt,
      existing.rows[0].id
    ])
    return result.rows[0]
  } else {
    // Create new
    const result = await pool.query(`
      INSERT INTO ai_prompt_settings (
        demographic_prompt, interview_prompt, insight_prompt, chat_ai_prompt
      ) VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      settings.demographicPrompt,
      settings.interviewPrompt,
      settings.insightPrompt,
      settings.chatAIPrompt
    ])
    return result.rows[0]
  }
}

export const getAIConfigSettings = async () => {
  const result = await pool.query(`
    SELECT 
      id, 
      micro_ai_version, 
      rule_confidence_base, 
      llm_confidence_boost,
      theme_similarity_threshold,
      min_support_sessions,
      credibility_weight_support,
      credibility_weight_confidence,
      credibility_weight_saturation,
      created_at, 
      updated_at
    FROM ai_config_settings
    ORDER BY updated_at DESC
    LIMIT 1
  `)

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    microAiVersion: row.micro_ai_version,
    ruleConfidenceBase: parseFloat(row.rule_confidence_base),
    llmConfidenceBoost: parseFloat(row.llm_confidence_boost),
    themeSimilarityThreshold: parseFloat(row.theme_similarity_threshold),
    minSupportSessions: parseInt(row.min_support_sessions),
    credibilityWeightSupport: parseFloat(row.credibility_weight_support),
    credibilityWeightConfidence: parseFloat(row.credibility_weight_confidence),
    credibilityWeightSaturation: parseFloat(row.credibility_weight_saturation),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const saveAIConfigSettings = async (settings) => {
  // Check if settings exist
  const existing = await pool.query('SELECT id FROM ai_config_settings ORDER BY updated_at DESC LIMIT 1')
  
  if (existing.rows.length > 0) {
    // Update existing
    const result = await pool.query(`
      UPDATE ai_config_settings SET
        micro_ai_version = $1,
        rule_confidence_base = $2,
        llm_confidence_boost = $3,
        theme_similarity_threshold = $4,
        min_support_sessions = $5,
        credibility_weight_support = $6,
        credibility_weight_confidence = $7,
        credibility_weight_saturation = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
    `, [
      settings.microAiVersion,
      settings.ruleConfidenceBase,
      settings.llmConfidenceBoost,
      settings.themeSimilarityThreshold,
      settings.minSupportSessions,
      settings.credibilityWeightSupport,
      settings.credibilityWeightConfidence,
      settings.credibilityWeightSaturation,
      existing.rows[0].id
    ])
    return result.rows[0]
  } else {
    // Create new
    const result = await pool.query(`
      INSERT INTO ai_config_settings (
        micro_ai_version, 
        rule_confidence_base, 
        llm_confidence_boost,
        theme_similarity_threshold,
        min_support_sessions,
        credibility_weight_support,
        credibility_weight_confidence,
        credibility_weight_saturation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      settings.microAiVersion,
      settings.ruleConfidenceBase,
      settings.llmConfidenceBoost,
      settings.themeSimilarityThreshold,
      settings.minSupportSessions,
      settings.credibilityWeightSupport,
      settings.credibilityWeightConfidence,
      settings.credibilityWeightSaturation
    ])
    return result.rows[0]
  }
}

