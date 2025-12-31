/**
 * Input validation and sanitization utilities for backend
 */

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export function sanitizeString(input) {
  if (typeof input !== 'string') {
    return ''
  }
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 10000) // Limit length
}

/**
 * Validate required field
 */
export function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, error: `${fieldName} is required` }
  }
  return { valid: true }
}

/**
 * Validate string length
 */
export function validateLength(value, min, max, fieldName) {
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` }
  }
  
  const length = value.trim().length
  
  if (min && length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` }
  }
  
  if (max && length > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max} characters` }
  }
  
  return { valid: true }
}

/**
 * Validate number range
 */
export function validateNumber(value, min, max, fieldName) {
  const num = Number(value)
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` }
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` }
  }
  
  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must not exceed ${max}` }
  }
  
  return { valid: true }
}

/**
 * Validate and sanitize request body
 */
export function validateAnalyzeObjectiveRequest(body) {
  const errors = []
  
  // Validate required fields
  const objectiveValidation = validateRequired(body.objective, 'Objective')
  if (!objectiveValidation.valid) {
    errors.push(objectiveValidation.error)
  }
  
  // Validate and sanitize string fields
  if (body.objective) {
    const lengthValidation = validateLength(body.objective, 10, 2000, 'Objective')
    if (!lengthValidation.valid) {
      errors.push(lengthValidation.error)
    }
  }
  
  if (body.surveyName) {
    const lengthValidation = validateLength(body.surveyName, 3, 200, 'Survey name')
    if (!lengthValidation.valid) {
      errors.push(lengthValidation.error)
    }
  }
  
  if (body.topic) {
    const lengthValidation = validateLength(body.topic, 3, 300, 'Topic')
    if (!lengthValidation.valid) {
      errors.push(lengthValidation.error)
    }
  }
  
  // Validate question count if provided
  if (body.questionCount !== undefined) {
    const countValidation = validateNumber(body.questionCount, 1, 100, 'Question count')
    if (!countValidation.valid) {
      errors.push(countValidation.error)
    }
  }
  
  if (errors.length > 0) {
    return { valid: false, errors }
  }
  
  // Sanitize inputs
  return {
    valid: true,
    sanitized: {
      objective: sanitizeString(body.objective || ''),
      surveyName: sanitizeString(body.surveyName || ''),
      topic: sanitizeString(body.topic || ''),
      desiredInsights: sanitizeString(body.desiredInsights || ''),
      keyQuestions: sanitizeString(body.keyQuestions || ''),
      hypothesis: sanitizeString(body.hypothesis || ''),
      target: sanitizeString(body.target || ''),
      questionCount: body.questionCount ? Number(body.questionCount) : undefined,
      demographicQuestionCount: body.demographicQuestionCount ? Number(body.demographicQuestionCount) : undefined,
      model: sanitizeString(body.model || '')
    }
  }
}

/**
 * Validate analyze answer request
 */
export function validateAnalyzeAnswerRequest(body) {
  const errors = []
  
  // Validate required fields
  const answerValidation = validateRequired(body.answer, 'Answer')
  if (!answerValidation.valid) {
    errors.push(answerValidation.error)
  }
  
  if (body.answer) {
    const lengthValidation = validateLength(body.answer, 1, 5000, 'Answer')
    if (!lengthValidation.valid) {
      errors.push(lengthValidation.error)
    }
  }
  
  const objectiveValidation = validateRequired(body.objective, 'Objective')
  if (!objectiveValidation.valid) {
    errors.push(objectiveValidation.error)
  }
  
  if (errors.length > 0) {
    return { valid: false, errors }
  }
  
  // Sanitize inputs
  return {
    valid: true,
    sanitized: {
      answer: sanitizeString(body.answer || ''),
      objective: sanitizeString(body.objective || ''),
      desiredInsights: sanitizeString(body.desiredInsights || ''),
      keyQuestions: sanitizeString(body.keyQuestions || ''),
      hypothesis: sanitizeString(body.hypothesis || ''),
      currentTopic: sanitizeString(body.currentTopic || ''),
      customPrompt: sanitizeString(body.customPrompt || ''),
      questionCount: body.questionCount ? Number(body.questionCount) : undefined,
      currentQuestionCount: body.currentQuestionCount ? Number(body.currentQuestionCount) : undefined,
      model: sanitizeString(body.model || ''),
      previousQuestions: Array.isArray(body.previousQuestions) 
        ? body.previousQuestions.map(q => sanitizeString(String(q)))
        : [],
      demographicData: body.demographicData && typeof body.demographicData === 'object'
        ? Object.fromEntries(
            Object.entries(body.demographicData).map(([key, value]) => [
              sanitizeString(String(key)),
              sanitizeString(String(value))
            ])
          )
        : {}
    }
  }
}

