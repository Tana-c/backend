import pool from '../database.js'

export const getAllCards = async () => {
  const result = await pool.query(`
    SELECT 
      id, title, body, survey_name, target, objective, 
      desired_insights, key_questions, hypothesis,
      question_count, demographic_question_count, ai_model,
      target_audience, screening_questions, interview_guide,
      approved, approved_at, created_at, updated_at
    FROM cards
    ORDER BY created_at DESC
  `)
  return result.rows.map(row => ({
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    surveyName: row.survey_name,
    target: row.target,
    objective: row.objective,
    desiredInsights: row.desired_insights,
    keyQuestions: row.key_questions,
    hypothesis: row.hypothesis,
    questionCount: row.question_count,
    demographicQuestionCount: row.demographic_question_count,
    aiModel: row.ai_model,
    targetAudience: row.target_audience,
    screeningQuestions: row.screening_questions,
    interviewGuide: row.interview_guide,
    approved: row.approved,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export const getCardById = async (id) => {
  const result = await pool.query(`
    SELECT 
      id, title, body, survey_name, target, objective, 
      desired_insights, key_questions, hypothesis,
      question_count, demographic_question_count, ai_model,
      target_audience, screening_questions, interview_guide,
      approved, approved_at, created_at, updated_at
    FROM cards
    WHERE id = $1
  `, [id])

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    surveyName: row.survey_name,
    target: row.target,
    objective: row.objective,
    desiredInsights: row.desired_insights,
    keyQuestions: row.key_questions,
    hypothesis: row.hypothesis,
    questionCount: row.question_count,
    demographicQuestionCount: row.demographic_question_count,
    aiModel: row.ai_model,
    targetAudience: row.target_audience,
    screeningQuestions: row.screening_questions,
    interviewGuide: row.interview_guide,
    approved: row.approved,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export const createCard = async (card) => {
  const result = await pool.query(`
    INSERT INTO cards (
      id, title, body, survey_name, target, objective,
      desired_insights, key_questions, hypothesis,
      question_count, demographic_question_count, ai_model,
      target_audience, screening_questions, interview_guide,
      approved, approved_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
    ) RETURNING *
  `, [
    card.id,
    card.title || '',
    card.body || '',
    card.surveyName,
    card.target,
    card.objective,
    card.desiredInsights,
    card.keyQuestions,
    card.hypothesis,
    card.questionCount,
    card.demographicQuestionCount,
    card.aiModel,
    JSON.stringify(card.targetAudience || null),
    JSON.stringify(card.screeningQuestions || null),
    JSON.stringify(card.interviewGuide || null),
    card.approved || false,
    card.approvedAt || null
  ])

  return result.rows[0]
}

export const updateCard = async (id, card) => {
  const result = await pool.query(`
    UPDATE cards SET
      title = $2,
      body = $3,
      survey_name = $4,
      target = $5,
      objective = $6,
      desired_insights = $7,
      key_questions = $8,
      hypothesis = $9,
      question_count = $10,
      demographic_question_count = $11,
      ai_model = $12,
      target_audience = $13,
      screening_questions = $14,
      interview_guide = $15,
      approved = $16,
      approved_at = $17,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `, [
    id,
    card.title || '',
    card.body || '',
    card.surveyName,
    card.target,
    card.objective,
    card.desiredInsights,
    card.keyQuestions,
    card.hypothesis,
    card.questionCount,
    card.demographicQuestionCount,
    card.aiModel,
    JSON.stringify(card.targetAudience || null),
    JSON.stringify(card.screeningQuestions || null),
    JSON.stringify(card.interviewGuide || null),
    card.approved || false,
    card.approvedAt || null
  ])

  return result.rows[0]
}

export const deleteCard = async (id) => {
  await pool.query('DELETE FROM cards WHERE id = $1', [id])
  return true
}

export const searchCards = async (query) => {
  const result = await pool.query(`
    SELECT 
      id, title, body, survey_name, target, objective, 
      desired_insights, key_questions, hypothesis,
      question_count, demographic_question_count, ai_model,
      target_audience, screening_questions, interview_guide,
      approved, approved_at, created_at, updated_at
    FROM cards
    WHERE survey_name ILIKE $1 OR title ILIKE $1
    ORDER BY created_at DESC
  `, [`%${query}%`])

  return result.rows.map(row => ({
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    surveyName: row.survey_name,
    target: row.target,
    objective: row.objective,
    desiredInsights: row.desired_insights,
    keyQuestions: row.key_questions,
    hypothesis: row.hypothesis,
    questionCount: row.question_count,
    demographicQuestionCount: row.demographic_question_count,
    aiModel: row.ai_model,
    targetAudience: row.target_audience,
    screeningQuestions: row.screening_questions,
    interviewGuide: row.interview_guide,
    approved: row.approved,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

