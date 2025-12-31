import pool from '../database.js'

export const createInterviewResult = async (interviewData) => {
  const result = await pool.query(`
    INSERT INTO interview_results (
      card_id, segment, key_focus, topic, persona, transcript
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [
    interviewData.id || interviewData.cardId,
    interviewData.segment,
    interviewData.key_focus,
    interviewData.topic,
    JSON.stringify(interviewData.persona || {}),
    JSON.stringify(interviewData.transcript || [])
  ])

  return result.rows[0]
}

export const getInterviewResultsByCardId = async (cardId) => {
  const result = await pool.query(`
    SELECT 
      id, card_id, segment, key_focus, topic, persona, transcript,
      created_at, updated_at
    FROM interview_results
    WHERE card_id = $1
    ORDER BY created_at DESC
  `, [cardId])

  return result.rows.map(row => ({
    id: row.id.toString(),
    cardId: row.card_id,
    segment: row.segment,
    key_focus: row.key_focus,
    topic: row.topic,
    persona: row.persona,
    transcript: row.transcript,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export const getInterviewResultById = async (id) => {
  const result = await pool.query(`
    SELECT 
      id, card_id, segment, key_focus, topic, persona, transcript,
      created_at, updated_at
    FROM interview_results
    WHERE id = $1
  `, [id])

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id.toString(),
    cardId: row.card_id,
    segment: row.segment,
    key_focus: row.key_focus,
    topic: row.topic,
    persona: row.persona,
    transcript: row.transcript,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const updateInterviewResult = async (id, interviewData) => {
  const result = await pool.query(`
    UPDATE interview_results SET
      segment = $2,
      key_focus = $3,
      topic = $4,
      persona = $5,
      transcript = $6,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [
    id,
    interviewData.segment,
    interviewData.key_focus,
    interviewData.topic,
    JSON.stringify(interviewData.persona || {}),
    JSON.stringify(interviewData.transcript || [])
  ])

  return result.rows[0]
}

export const deleteInterviewResult = async (id) => {
  await pool.query('DELETE FROM interview_results WHERE id = $1', [id])
  return true
}

export const createInterviewSession = async (sessionData) => {
  const result = await pool.query(`
    INSERT INTO interview_sessions (
      card_id, messages, demographic_data
    ) VALUES ($1, $2, $3)
    RETURNING *
  `, [
    sessionData.cardId,
    JSON.stringify(sessionData.messages || []),
    JSON.stringify(sessionData.demographicData || {})
  ])

  return result.rows[0]
}

export const getInterviewSessionsByCardId = async (cardId) => {
  const result = await pool.query(`
    SELECT id, card_id, messages, demographic_data, created_at
    FROM interview_sessions
    WHERE card_id = $1
    ORDER BY created_at DESC
  `, [cardId])

  return result.rows.map(row => ({
    id: row.id,
    cardId: row.card_id,
    messages: row.messages,
    demographicData: row.demographic_data,
    timestamp: row.created_at
  }))
}

export const getAllInterviewResults = async () => {
  const result = await pool.query(`
    SELECT 
      id, card_id, segment, key_focus, topic, persona, transcript,
      created_at, updated_at
    FROM interview_results
    ORDER BY created_at DESC
  `)

  return result.rows.map(row => ({
    id: row.id.toString(),
    cardId: row.card_id,
    segment: row.segment,
    key_focus: row.key_focus,
    topic: row.topic,
    persona: row.persona,
    transcript: row.transcript,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

