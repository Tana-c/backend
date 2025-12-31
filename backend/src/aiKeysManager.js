import { encryptForStorage, decryptFromStorage } from './cryptoUtils.js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const KEYS_DB_PATH = join(__dirname, 'ai-keys.json')

// Default AI models for different providers
const DEFAULT_MODELS = [
  // OpenAI
  { id: 'gpt-5', name: 'GPT-5', provider: 'openai' },
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'openai' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  
  // Anthropic Claude
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  
  // Google Gemini
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)', provider: 'google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' },
  
  // xAI Grok (using OpenAI-compatible API if available)
  { id: 'grok-beta', name: 'Grok Beta', provider: 'xai' }
]

// Provider information
export const PROVIDER_INFO = {
  openai: {
    name: 'OpenAI',
    color: 'bg-green-100 text-green-800',
    apiKeyPlaceholder: 'sk-...',
    apiKeyUrl: 'https://platform.openai.com/api-keys'
  },
  anthropic: {
    name: 'Anthropic Claude',
    color: 'bg-orange-100 text-orange-800',
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyUrl: 'https://console.anthropic.com/account/keys'
  },
  google: {
    name: 'Google Gemini',
    color: 'bg-blue-100 text-blue-800',
    apiKeyPlaceholder: 'AIza...',
    apiKeyUrl: 'https://makersuite.google.com/app/apikey'
  },
  xai: {
    name: 'xAI Grok',
    color: 'bg-purple-100 text-purple-800',
    apiKeyPlaceholder: 'xai-...',
    apiKeyUrl: 'https://console.x.ai/'
  }
}

// Load keys database
function loadKeysDB() {
  try {
    if (existsSync(KEYS_DB_PATH)) {
      const data = readFileSync(KEYS_DB_PATH, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error loading keys DB:', error)
  }
  
  // Return default structure
  return {
    keys: {},
    models: DEFAULT_MODELS,
    activeModel: 'gpt-5-mini' // Default to GPT-5 Mini
  }
}

// Save keys database
function saveKeysDB(data) {
  try {
    writeFileSync(KEYS_DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('Error saving keys DB:', error)
    return false
  }
}

/**
 * Get all keys (without decryption)
 */
export function getAllKeys() {
  const db = loadKeysDB()
  const keys = db.keys || {}
  
  // Build provider keys status
  const providerKeys = {}
  Object.keys(PROVIDER_INFO).forEach(provider => {
    providerKeys[provider] = !!keys[provider]
  })
  
  // Merge DEFAULT_MODELS with db.models to ensure all default models are included
  const dbModels = db.models || []
  const defaultModelIds = new Set(DEFAULT_MODELS.map(m => m.id))
  const customModels = dbModels.filter(m => !defaultModelIds.has(m.id))
  const mergedModels = [...DEFAULT_MODELS, ...customModels]
  
  return {
    models: mergedModels,
    activeModel: db.activeModel || 'gpt-5-mini',
    hasKeys: Object.keys(keys).length > 0,
    providerKeys
  }
}

/**
 * Get decrypted API key for a provider
 */
export function getApiKey(provider = 'openai') {
  const db = loadKeysDB()
  const encryptedKey = db.keys?.[provider]
  
  if (!encryptedKey) {
    return null
  }
  
  try {
    return decryptFromStorage(encryptedKey)
  } catch (error) {
    console.error(`Error decrypting key for ${provider}:`, error)
    return null
  }
}

/**
 * Save encrypted API key for a provider
 */
export function saveApiKey(provider, apiKey) {
  if (!apiKey || !provider) {
    throw new Error('Provider and API key are required')
  }
  
  const db = loadKeysDB()
  if (!db.keys) {
    db.keys = {}
  }
  
  try {
    const encrypted = encryptForStorage(apiKey)
    db.keys[provider] = encrypted
    
    if (saveKeysDB(db)) {
      return { success: true }
    } else {
      throw new Error('Failed to save keys database')
    }
  } catch (error) {
    console.error('Error saving API key:', error)
    throw error
  }
}

/**
 * Delete API key for a provider
 */
export function deleteApiKey(provider) {
  const db = loadKeysDB()
  
  if (db.keys && db.keys[provider]) {
    delete db.keys[provider]
    return saveKeysDB(db)
  }
  
  return true
}

/**
 * Get active model
 */
export function getActiveModel() {
  const db = loadKeysDB()
  return db.activeModel || 'gpt-5-mini'
}

/**
 * Set active model
 */
export function setActiveModel(modelId) {
  const db = loadKeysDB()
  
  // Validate model exists
  const models = db.models || DEFAULT_MODELS
  const modelExists = models.some(m => m.id === modelId)
  
  if (!modelExists) {
    throw new Error('Model not found')
  }
  
  db.activeModel = modelId
  return saveKeysDB(db)
}

/**
 * Add custom model
 */
export function addModel(model) {
  if (!model.id || !model.name || !model.provider) {
    throw new Error('Model must have id, name, and provider')
  }
  
  const db = loadKeysDB()
  if (!db.models) {
    db.models = DEFAULT_MODELS
  }
  
  // Check if model already exists
  const exists = db.models.some(m => m.id === model.id)
  if (exists) {
    throw new Error('Model already exists')
  }
  
  db.models.push(model)
  return saveKeysDB(db)
}

/**
 * Delete custom model
 */
export function deleteModel(modelId) {
  const db = loadKeysDB()
  
  // Don't allow deleting default models
  const isDefault = DEFAULT_MODELS.some(m => m.id === modelId)
  if (isDefault) {
    throw new Error('Cannot delete default model')
  }
  
  if (db.models) {
    db.models = db.models.filter(m => m.id !== modelId)
    
    // If active model was deleted, switch to default
    if (db.activeModel === modelId) {
      db.activeModel = 'gpt-5-mini'
    }
    
    return saveKeysDB(db)
  }
  
  return true
}
