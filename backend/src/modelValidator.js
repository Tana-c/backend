/**
 * Validates and returns a safe model to use
 * Falls back to gpt-4o-mini if the requested model is not available
 */
export function getSafeModel(modelId) {
  // List of confirmed available OpenAI models (models that definitely exist in OpenAI API)
  const confirmedAvailableModels = [
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo'
  ]
  
  // If model is confirmed available, return it
  if (confirmedAvailableModels.includes(modelId)) {
    return modelId
  }
  
  // For future models like gpt-5, gpt-5-mini, etc., we'll try to use them
  // but if they fail, the error handler will catch it
  // For now, fall back to gpt-4o-mini for safety
  // TODO: When GPT-5 is actually released, remove this fallback
  if (modelId && (modelId.startsWith('gpt-') || modelId.startsWith('o'))) {
    // It's a valid OpenAI model name format, but may not exist yet
    // We'll try it, but log a warning
    console.warn(`Model ${modelId} may not be available yet. If you get an error, please use a confirmed model.`)
    // For safety, fall back to gpt-4o-mini until GPT-5 is confirmed available
    return 'gpt-4o-mini'
  }
  
  console.warn(`Model ${modelId} is not a valid OpenAI model name, falling back to gpt-4o-mini`)
  return 'gpt-4o-mini'
}

/**
 * Checks if a model name looks valid (for OpenAI models)
 */
export function isValidOpenAIModel(modelId) {
  // OpenAI model naming pattern
  const openAIPattern = /^(gpt-[0-9o.-]+|gpt-[0-9]o-mini|o[0-9]-[a-z]+)$/i
  return openAIPattern.test(modelId)
}

/**
 * Checks if a model supports JSON mode (response_format: 'json_object')
 * Reference: https://platform.openai.com/docs/guides/text-generation/json-mode
 * Only specific OpenAI GPT models support JSON mode:
 * - gpt-4o, gpt-4o-mini (released 2024)
 * - gpt-4-turbo, gpt-4-turbo-preview
 * - gpt-4-1106-preview and later versions
 * - gpt-3.5-turbo-1106 and later versions
 * - Base gpt-4 (without version suffix) does NOT support JSON mode
 */
export function supportsJsonMode(modelId) {
  if (!modelId) return false
  
  const normalizedId = modelId.toLowerCase().trim()
  
  // GPT-4o series (definitely support JSON mode)
  if (normalizedId === 'gpt-4o' || normalizedId === 'gpt-4o-mini') {
    return true
  }
  
  // GPT-4 Turbo models
  if (normalizedId === 'gpt-4-turbo' || normalizedId === 'gpt-4-turbo-preview') {
    return true
  }
  
  // GPT-4 with version suffix (1106+ support JSON mode)
  if (normalizedId.startsWith('gpt-4-')) {
    const versionMatch = normalizedId.match(/gpt-4-(\d+)/)
    if (versionMatch) {
      const version = parseInt(versionMatch[1])
      // gpt-4-1106-preview and later support JSON mode
      return version >= 1106
    }
    // gpt-4-base or gpt-4-32k, etc. - check explicitly
    // These older models do NOT support JSON mode
    return false
  }
  
  // Base gpt-4 (without version) - does NOT support JSON mode
  if (normalizedId === 'gpt-4') {
    return false
  }
  
  // GPT-3.5 Turbo models
  if (normalizedId.startsWith('gpt-3.5-turbo')) {
    // Check for version suffix
    const versionMatch = normalizedId.match(/gpt-3.5-turbo(?:-(\d+))?/)
    if (versionMatch && versionMatch[1]) {
      const version = parseInt(versionMatch[1])
      // gpt-3.5-turbo-1106 and later support JSON mode
      return version >= 1106
    }
    // Latest gpt-3.5-turbo (default) - check if it's the new version
    // The default gpt-3.5-turbo now typically supports JSON mode, but to be safe,
    // only return true for explicit newer versions
    return normalizedId.includes('1106') || normalizedId.includes('0125') || normalizedId.includes('16')
  }
  
  // GPT-5 models (assume they support JSON mode)
  if (normalizedId === 'gpt-5' || normalizedId === 'gpt-5.1' || normalizedId === 'gpt-5-mini' || normalizedId.startsWith('gpt-5')) {
    return true
  }
  
  // Default: don't assume JSON mode support
  return false
}

