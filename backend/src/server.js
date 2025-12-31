import express from 'express'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import cors from 'cors'
import OpenAI from 'openai'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
import { 
  getAllKeys, 
  getApiKey, 
  getActiveModel,
  saveApiKey,
  deleteApiKey,
  setActiveModel,
  addModel,
  deleteModel,
  PROVIDER_INFO
} from './aiKeysManager.js'
import { getSafeModel, supportsJsonMode } from './modelValidator.js'
import { validateAnalyzeObjectiveRequest, validateAnalyzeAnswerRequest } from './validation.js'
import { initializeDatabase } from './database.js'
import * as CardsModel from './models/cards.js'
import * as InterviewsModel from './models/interviews.js'
import * as SettingsModel from './models/settings.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()

// Server configuration - supports both localhost and production server
// For localhost: use PORT=3001 and HOST=localhost
// For production server: use PORT=7183 (or your port) and HOST=0.0.0.0
const PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 7183 : 3001)
const HOST = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost')

app.use(cors())
app.use(express.json())

// Initialize database on startup
initializeDatabase().catch(err => {
  console.error('❌ Error initializing database:', err.message || err)
  
  // Provide helpful error messages based on error type
  if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
    console.warn('⚠️  Cannot connect to PostgreSQL database')
    console.warn('💡 Troubleshooting tips:')
    console.warn('   1. Make sure PostgreSQL is running')
    if (process.env.NODE_ENV === 'production') {
      console.warn('   2. For server: Check if PostgreSQL is on port 5433')
      console.warn('   3. For server: Verify DATABASE_URL in docker-compose.yml')
    } else {
      console.warn('   2. For localhost: PostgreSQL usually runs on port 5432 (default)')
      console.warn('   3. Create .env file with: DB_PORT=5432')
      console.warn('   4. Or set: DATABASE_URL=postgresql://postgres:password@localhost:5432/interview_db')
    }
  } else if (err.code === '28P01' || err.message?.includes('password authentication failed')) {
    console.warn('⚠️  Password authentication failed for PostgreSQL user')
    console.warn('💡 Troubleshooting tips:')
    console.warn('   1. Check if PostgreSQL password is correct')
    console.warn('   2. Create .env file in backend/ folder with correct password:')
    console.warn('      DB_PASSWORD=your_actual_password')
    console.warn('   3. Or set full DATABASE_URL:')
    console.warn('      DATABASE_URL=postgresql://postgres:your_actual_password@localhost:5432/interview_db')
    console.warn('   4. If you don\'t know the password, you can reset it:')
    console.warn('      psql -U postgres')
    console.warn('      ALTER USER postgres PASSWORD \'new_password\';')
    console.warn('   5. Or use a different user (if you have one):')
    console.warn('      DB_USER=your_username')
    console.warn('      DB_PASSWORD=your_password')
  } else if (err.code === '3D000' || err.message?.includes('does not exist')) {
    console.warn('⚠️  Database "interview_db" does not exist')
    console.warn('💡 Create the database:')
    
    // Platform-specific instructions
    if (process.platform === 'win32') {
      console.warn('   For Windows:')
      console.warn('   1. Open Command Prompt or PowerShell')
      console.warn('   2. Run: psql -U postgres')
      console.warn('   3. Enter your PostgreSQL password when prompted')
      console.warn('   4. Run: CREATE DATABASE interview_db;')
      console.warn('   5. Run: \\q to exit')
      console.warn('   Or use pgAdmin: Right-click Databases > Create > Database')
    } else {
      console.warn('   For Linux/Mac:')
      console.warn('   psql -U postgres -c "CREATE DATABASE interview_db;"')
      console.warn('   Or: psql -U postgres')
      console.warn('        CREATE DATABASE interview_db;')
    }
    
    console.warn('   Note: Database will be auto-created on next restart if permissions allow')
  } else {
    console.warn('⚠️  Database connection failed:', err.message || 'Unknown error')
    if (err.code) {
      console.warn(`   Error code: ${err.code}`)
    }
  }
  
  console.warn('⚠️  Server will continue but database features may not work')
  // Don't exit - allow server to start even if database is not available
  // This is useful for both Docker environments and localhost testing
})

// Initialize OpenAI with key from database
function getOpenAIClient() {
  const apiKey = getApiKey('openai')
  const model = getActiveModel()
  
  if (!apiKey) {
    console.warn('Warning: No OpenAI API key found. Please configure it in AI Settings.')
  }
  
  return {
    client: new OpenAI({
      apiKey: apiKey || 'dummy-key'
    }),
    model: model
  }
}

// Helper function to get OpenAI client with current settings
function getOpenAI() {
  const config = getOpenAIClient()
  return config.client
}

// Helper function to get current model
function getCurrentModel() {
  return getActiveModel()
}

// Load interview data
const loadInterviews = () => {
  try {
    const dataPath = join(__dirname, 'data.json')
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'))
    return data.interviews || []
  } catch (error) {
    console.error('Error loading interviews:', error)
    return []
  }
}

// ============ AI Keys Management APIs ============

// Get all keys and models (without decrypted keys)
app.get('/api/ai-keys', (req, res) => {
  try {
    const keysInfo = getAllKeys()
    res.json({
      success: true,
      ...keysInfo,
      providerInfo: PROVIDER_INFO
    })
  } catch (error) {
    console.error('Error getting AI keys:', error)
    res.status(500).json({ 
      error: 'Failed to get AI keys',
      message: error.message 
    })
  }
})

// Save API key for a provider
app.post('/api/ai-keys/:provider', (req, res) => {
  try {
    const { provider } = req.params
    const { apiKey } = req.body
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' })
    }
    
    saveApiKey(provider, apiKey)
    
    res.json({ success: true, message: 'API key saved successfully' })
  } catch (error) {
    console.error('Error saving API key:', error)
    res.status(500).json({ 
      error: 'Failed to save API key',
      message: error.message 
    })
  }
})

// Delete API key for a provider
app.delete('/api/ai-keys/:provider', (req, res) => {
  try {
    const { provider } = req.params
    deleteApiKey(provider)
    
    res.json({ success: true, message: 'API key deleted successfully' })
  } catch (error) {
    console.error('Error deleting API key:', error)
    res.status(500).json({ 
      error: 'Failed to delete API key',
      message: error.message 
    })
  }
})

// Get active model
app.get('/api/ai-models/active', (req, res) => {
  try {
    const model = getActiveModel()
    res.json({ success: true, model })
  } catch (error) {
    console.error('Error getting active model:', error)
    res.status(500).json({ 
      error: 'Failed to get active model',
      message: error.message 
    })
  }
})

// Set active model
app.post('/api/ai-models/active', (req, res) => {
  try {
    const { modelId } = req.body
    
    if (!modelId) {
      return res.status(400).json({ error: 'Model ID is required' })
    }
    
    setActiveModel(modelId)
    
    res.json({ success: true, message: 'Active model updated successfully' })
  } catch (error) {
    console.error('Error setting active model:', error)
    res.status(500).json({ 
      error: 'Failed to set active model',
      message: error.message 
    })
  }
})

// Add custom model
app.post('/api/ai-models', (req, res) => {
  try {
    const model = req.body
    addModel(model)
    
    res.json({ success: true, message: 'Model added successfully' })
  } catch (error) {
    console.error('Error adding model:', error)
    res.status(500).json({ 
      error: 'Failed to add model',
      message: error.message 
    })
  }
})

// Delete custom model
app.delete('/api/ai-models/:modelId', (req, res) => {
  try {
    const { modelId } = req.params
    deleteModel(modelId)
    
    res.json({ success: true, message: 'Model deleted successfully' })
  } catch (error) {
    console.error('Error deleting model:', error)
    res.status(500).json({ 
      error: 'Failed to delete model',
      message: error.message 
    })
  }
})

// ============ Interview APIs ============

// Get all interviews
// Demo data endpoint - serve demo data from backend
app.get('/api/demo-data', (req, res) => {
  try {
    const demoDataPath = join(__dirname, 'demo-data', 'data.json')
    if (!existsSync(demoDataPath)) {
      return res.status(404).json({ error: 'Demo data not found' })
    }
    const demoData = JSON.parse(readFileSync(demoDataPath, 'utf-8'))
    res.json(demoData)
  } catch (error) {
    console.error('Error loading demo data:', error)
    res.status(500).json({ error: 'Failed to load demo data', message: error.message })
  }
})

// Serve themes CSV from backend/src/demo-data/data_ai/themes_ai.csv
app.get('/api/demo-data/themes', (req, res) => {
  try {
    const themesPath = join(__dirname, 'demo-data', 'data_ai', 'themes_ai.csv')
    if (!existsSync(themesPath)) {
      return res.status(404).json({ error: 'Themes CSV not found' })
    }
    const themesData = readFileSync(themesPath, 'utf-8')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.send(themesData)
  } catch (error) {
    console.error('Error loading themes CSV:', error)
    res.status(500).json({ error: 'Failed to load themes CSV', message: error.message })
  }
})

// Serve interview themes CSV from backend/src/demo-data/data_ai/interview_themes_ai.csv
app.get('/api/demo-data/interview-themes', (req, res) => {
  try {
    const interviewThemesPath = join(__dirname, 'demo-data', 'data_ai', 'interview_themes_ai.csv')
    if (!existsSync(interviewThemesPath)) {
      return res.status(404).json({ error: 'Interview themes CSV not found' })
    }
    const interviewThemesData = readFileSync(interviewThemesPath, 'utf-8')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.send(interviewThemesData)
  } catch (error) {
    console.error('Error loading interview themes CSV:', error)
    res.status(500).json({ error: 'Failed to load interview themes CSV', message: error.message })
  }
})

app.get('/api/interviews', (req, res) => {
  const interviews = loadInterviews()
  res.json(interviews)
})

// Get interviews by cardId (must be before /api/interviews/:id to avoid route conflict)
// This route uses database and should be checked first
app.get('/api/interviews/by-card/:cardId', async (req, res) => {
  try {
    const interviews = await InterviewsModel.getInterviewResultsByCardId(req.params.cardId)
    res.json(interviews)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching interviews by card:', error)
    }
    res.status(500).json({ error: 'Failed to fetch interviews', message: error.message })
  }
})

// Get interview by ID (for individual interview lookup)
app.get('/api/interviews/:id', (req, res) => {
  const interviews = loadInterviews()
  const interview = interviews.find(i => i.id === req.params.id)
  
  if (!interview) {
    return res.status(404).json({ error: 'Interview not found' })
  }
  
  res.json(interview)
})

// Save new interview result
app.post('/api/interviews/:id/results', (req, res) => {
  // In a real app, you would save this to a database
  // For now, we'll just return success
  res.json({ success: true, message: 'Interview result saved' })
})

// Phase 1: Analyze Objective and Generate Target Audience, Screening Questions, Interview Guide
app.post('/api/analyze-objective', async (req, res) => {
  try {
    // Validate and sanitize input
    const validation = validateAnalyzeObjectiveRequest(req.body)
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: validation.errors
      })
    }
    
    const { objective, surveyName, topic, desiredInsights, keyQuestions, hypothesis, target, demographicQuestionCount, questionCount, model } = validation.sanitized

    const demoQuestionCount = demographicQuestionCount || 5
    const inDepthQuestionCount = questionCount || 10

    // Build context string
    let contextInfo = `- ชื่อแบบสอบถาม: ${surveyName || 'ไม่ระบุ'}
- หัวข้อ: ${topic || 'ไม่ระบุ'}
- วัตถุประสงค์ของงาน: ${objective}`
    
    if (desiredInsights) {
      contextInfo += `\n- Insight ที่ต้องการค้นหา: ${desiredInsights}`
    }
    if (keyQuestions) {
      contextInfo += `\n- ประเด็นที่แบรนด์อยากเข้าใจ: ${keyQuestions}`
    }
    if (hypothesis) {
      contextInfo += `\n- สมมติฐานหรือปัญหาที่ต้องการตรวจสอบ: ${hypothesis}`
    }
    if (target) {
      contextInfo += `\n- กลุ่มผู้บริโภคเป้าหมาย: ${target}`
    }

    const prompt = `คุณเป็นผู้เชี่ยวชาญในการออกแบบการวิจัยเชิงคุณภาพ (Qualitative Research)

ข้อมูลที่ได้รับ:
${contextInfo}

กรุณาวิเคราะห์และให้ข้อมูลต่อไปนี้ในรูปแบบ JSON โดยคำถามต้องถูกปรับให้เหมาะสมกับ Objective ของงานนั้นๆ:

**คำแนะนำสำคัญ:**
1. **Demo Questions (Pre-Screen)**: สร้างคำถามทั้งหมด ${demoQuestionCount} ข้อ โดยแบ่งเป็น 2 หมวด:

   **หมวดที่ 1: ข้อมูลประชากรพื้นฐาน (Demographic) - ต้องมี 4 ข้อ:**
   - อายุ (เช่น: "คุณอายุเท่าไหร่คะ?" หรือ "คุณอยู่ในช่วงอายุเท่าไหร่คะ?")
   - อาชีพ/การทำงาน (เช่น: "คุณทำงานอะไรคะ?" หรือ "อาชีพของคุณคืออะไรคะ?")
   - ประเภทที่พักอาศัย (เช่น: "คุณพักอยู่ที่พักอาศัยแบบไหนคะ? เช่น บ้าน หอพัก คอนโด")
   - เงินเดือนเฉลี่ย (เช่น: "เงินเดือนเฉลี่ยของคุณอยู่ที่ประมาณเท่าไหร่คะ?" หรือ "รายได้ต่อเดือนของคุณประมาณเท่าไหร่คะ?")
   
   **หมวดที่ 2: ข้อมูลที่เกี่ยวข้องกับ Topic/Objective - ต้องมี 2-3 ข้อ:**
   สร้างคำถามที่เกี่ยวข้องกับ Topic, Objective, Desired Insights, Key Questions, Hypothesis, และ Target Audience
   คำถามเหล่านี้ควรเป็นคำถามคัดกรองเบื้องต้นที่ช่วยประเมินว่าผู้ตอบตรงกับกลุ่มเป้าหมายและมีความเกี่ยวข้องกับ Topic/Objective หรือไม่
   
   **หมายเหตุ:** จำนวนคำถามทั้งหมดควรเป็น ${demoQuestionCount} ข้อ (4 ข้อประชากรพื้นฐาน + 2-3 ข้อที่เกี่ยวข้องกับ Topic/Objective)

2. **In-Depth Research Questions**: สร้าง ${inDepthQuestionCount} คำถาม Insight ที่ตอบโจทย์ Objective โดยตรง เป็นคำถามปลายเปิดที่เจาะลึกถึง:
   - แรงจูงใจ (Motivation)
   - ปัจจัยในการตัดสินใจ (Decision Factors)
   - ประสบการณ์และอารมณ์ความรู้สึก (Experience & Emotions)
   - พฤติกรรมที่ซ่อนอยู่ (Hidden Behaviors)
   
   ตัวอย่าง: ถ้า Objective คือ "เพื่อเข้าใจปัจจัยที่ทำให้ลูกค้าตัดสินใจ" 
   → คำถามควรเป็น: "อะไรคือเหตุผลที่ทำให้คุณเลือกซื้อผลิตภัณฑ์นี้เหนือแบรนด์อื่น?"
   หรือ "ช่วยเล่าให้ฟังเกี่ยวกับประสบการณ์ในการเลือกซื้อ [ผลิตภัณฑ์] ครั้งล่าสุดของคุณ"

{
  "targetAudience": {
    "description": "อธิบายกลุ่มเป้าหมายที่ควรสัมภาษณ์ (เช่น อายุ, เพศ, พฤติกรรม, ประสบการณ์)",
    "keyCharacteristics": ["ลักษณะสำคัญ 1", "ลักษณะสำคัญ 2", "ลักษณะสำคัญ 3"]
  },
  "screeningQuestions": [
    {
      "question": "คำถามประชากรพื้นฐานที่ปรับให้เหมาะกับ Objective 1",
      "type": "demographic|behavior|experience",
      "criteria": "เงื่อนไขที่ต้องผ่าน (เช่น อายุ 25-40 ปี)"
    }
    // สร้างทั้งหมด ${demoQuestionCount} คำถาม
  ],
  "interviewGuide": {
    "mainQuestions": [
      "คำถาม Insight ที่ตอบโจทย์ Objective โดยตรง (คำถามปลายเปิด)",
      // สร้างทั้งหมด ${inDepthQuestionCount} คำถาม
    ],
    "probingGuidelines": [
      "แนวทางการเจาะลึกเมื่อได้คำตอบที่น่าสนใจ",
      "คำถามต่อยอดที่ควรถามเมื่อต้องการข้อมูลเพิ่มเติม"
    ],
    "keyTopics": ["หัวข้อสำคัญที่ต้องครอบคลุม", "หัวข้อ 2", "หัวข้อ 3"]
  }
}

กรุณาตอบเป็น JSON เท่านั้น ไม่ต้องมีข้อความอื่น และสร้างจำนวนคำถามตามที่กำหนด`

    // Check if API key exists
    const apiKey = getApiKey('openai')
    if (!apiKey || apiKey === 'dummy-key') {
      return res.status(400).json({
        error: 'API key not configured',
        message: 'Please configure your OpenAI API key in AI Settings before using this feature.'
      })
    }
    
    const openaiClient = getOpenAI()
    // Use model from request, or fallback to active model, or default
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    
    console.log(`Using model: ${modelToUse} (requested: ${requestedModel || 'default'}), JSON mode supported: ${supportsJsonMode(modelToUse)}`)
    
    // Only use JSON mode if model supports it
    const requestOptions = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: supportsJsonMode(modelToUse) 
            ? 'คุณเป็นผู้เชี่ยวชาญในการออกแบบการวิจัยเชิงคุณภาพ ตอบเป็น JSON format เท่านั้น'
            : 'คุณเป็นผู้เชี่ยวชาญในการออกแบบการวิจัยเชิงคุณภาพ กรุณาตอบเป็น JSON format เท่านั้น (ไม่มีข้อความอื่นใดนอกเหนือจาก JSON)'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    }
    
    // Add response_format only if model supports it
    if (supportsJsonMode(modelToUse)) {
      requestOptions.response_format = { type: 'json_object' }
    }
    
    const completion = await openaiClient.chat.completions.create(requestOptions)

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    res.json({
      success: true,
      ...result,
      model: modelToUse
    })
  } catch (error) {
    // Log error for debugging (only in development)
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error analyzing objective:', error)
    }
    
    // Provide more helpful error messages
    let errorMessage = 'ไม่สามารถวิเคราะห์ด้วย AI ได้'
    let statusCode = 500
    
    if (error.status === 401 || error.code === 'invalid_api_key') {
      errorMessage = 'API Key ไม่ถูกต้อง กรุณาตรวจสอบ OpenAI API Key ในหน้า AI Settings'
      statusCode = 401
    } else if (error.status === 404 || error.code === 'model_not_found') {
      errorMessage = 'ไม่พบ Model ที่เลือก กรุณาเลือก Model อื่นในหน้า AI Settings'
      statusCode = 404
    } else if (error.status === 429) {
      errorMessage = 'เกิน Rate limit กรุณาลองใหม่อีกครั้งในภายหลัง'
      statusCode = 429
    } else if (error.message?.includes('API key')) {
      errorMessage = 'มีปัญหากับ API Key กรุณาตรวจสอบ OpenAI API Key ในหน้า AI Settings'
      statusCode = 401
    } else if (error.message) {
      errorMessage = error.message
    }
    
    res.status(statusCode).json({ 
      error: 'Failed to analyze objective',
      message: errorMessage
    })
  }
})

// Generate demographic questions from objective
app.post('/api/generate-demographic-questions', async (req, res) => {
  try {
    const { objective, topic, targetAudience, desiredInsights, keyQuestions, hypothesis, customPrompt, model } = req.body

    if (!objective) {
      return res.status(400).json({ error: 'Objective is required' })
    }

    // Get prompt from customPrompt, database, or use empty (will fail if no prompt)
    let prompt = customPrompt
    if (!prompt) {
      try {
        const settings = await SettingsModel.getAIPromptSettings()
        prompt = settings?.demographicPrompt || null
      } catch (error) {
        console.error('Error fetching prompt settings:', error)
      }
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt template available. Please configure AI prompts in Settings page first.' 
      })
    }

    // Replace placeholders
    prompt = prompt.replace(/\{objective\}/g, objective || 'ไม่ระบุ')
    prompt = prompt.replace(/\{topic\}/g, topic || 'ไม่ระบุ')
    prompt = prompt.replace(/\{targetAudience\}/g, targetAudience || 'ไม่ระบุ')
    prompt = prompt.replace(/\{desiredInsights\}/g, desiredInsights || 'ไม่ระบุ')
    prompt = prompt.replace(/\{keyQuestions\}/g, keyQuestions || 'ไม่ระบุ')
    prompt = prompt.replace(/\{hypothesis\}/g, hypothesis || 'ไม่ระบุ')

    const openaiClient = getOpenAI()
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    
    const requestOptions = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: supportsJsonMode(modelToUse)
            ? 'คุณเป็นผู้เชี่ยวชาญในการออกแบบการวิจัยเชิงคุณภาพ ต้องคิดคำถามด้วยความคิดสร้างสรรค์ ไม่ใช้ templates หรือ patterns สำเร็จรูป ตอบเป็น JSON format เท่านั้น'
            : 'คุณเป็นผู้เชี่ยวชาญในการออกแบบการวิจัยเชิงคุณภาพ ต้องคิดคำถามด้วยความคิดสร้างสรรค์ ไม่ใช้ templates หรือ patterns สำเร็จรูป กรุณาตอบเป็น JSON format เท่านั้น (ไม่มีข้อความอื่นใดนอกเหนือจาก JSON)'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9
    }
    
    if (supportsJsonMode(modelToUse)) {
      requestOptions.response_format = { type: 'json_object' }
    }
    
    const completion = await openaiClient.chat.completions.create(requestOptions)

    const aiResponse = completion.choices[0]?.message?.content || '{}'
    let result = {}
    
    try {
      result = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI Response:', aiResponse)
    }

    // Validate that questions exist
    if (!result.questions || !Array.isArray(result.questions) || result.questions.length === 0) {
      console.error('AI did not return questions')
      return res.status(500).json({
        error: 'AI did not generate demographic questions',
        message: 'Please try again or check your prompt settings'
      })
    }

    res.json({
      success: true,
      questions: result.questions,
      model: modelToUse || getSafeModel(getCurrentModel())
    })
  } catch (error) {
    console.error('Error generating demographic questions:', error)
    res.status(500).json({ 
      error: 'Failed to generate demographic questions',
      message: error.message 
    })
  }
})

// Generate first interview question based on demographic data and objective
app.post('/api/generate-first-question', async (req, res) => {
  try {
    const { objective, demographicData, desiredInsights, keyQuestions, hypothesis, customPrompt, model } = req.body

    if (!objective) {
      return res.status(400).json({ error: 'Objective is required' })
    }

    // Format demographic data
    const demographicText = demographicData && Object.keys(demographicData).length > 0
      ? Object.entries(demographicData)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : 'ไม่มีข้อมูล'

    // Get prompt from customPrompt, database, or use empty (will fail if no prompt)
    let prompt = customPrompt
    if (!prompt) {
      try {
        const settings = await SettingsModel.getAIPromptSettings()
        prompt = settings?.interviewPrompt || null
      } catch (error) {
        console.error('Error fetching prompt settings:', error)
      }
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt template available. Please configure AI prompts in Settings page first.' 
      })
    }

    // Replace placeholders with actual values (handle both custom and default prompts)
    // Replace all possible placeholder variations
    const replacements = {
      '{objective}': objective || 'ไม่ระบุ',
      '{demographicData}': demographicText,
      '{previousQuestions}': 'ไม่มี',
      '{desiredInsights}': desiredInsights || 'ไม่ระบุ',
      '{keyQuestions}': keyQuestions || 'ไม่ระบุ',
      '{hypothesis}': hypothesis || 'ไม่ระบุ'
    }
    
    // Replace all placeholders
    Object.keys(replacements).forEach(placeholder => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g')
      prompt = prompt.replace(regex, replacements[placeholder])
    })
    
    console.log('Final prompt (first 500 chars):', prompt.substring(0, 500))

    const openaiClient = getOpenAI()
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    
    const requestOptions = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: supportsJsonMode(modelToUse)
            ? `คุณเป็นผู้สัมภาษณ์มืออาชีพที่ต้องคิดคำถามด้วยความคิดสร้างสรรค์

⚠️ กฎสำคัญที่ต้องปฏิบัติตามเสมอ:
1. อ่าน objective อย่างละเอียดและถามเฉพาะสิ่งที่ระบุใน objective เท่านั้น
2. ห้ามอ้างอิงถึงผลิตภัณฑ์/หัวข้อ/แบรนด์ที่ไม่ได้ระบุใน objective
3. ถ้า objective ไม่ได้กล่าวถึง "น้ำยาล้างจาน" → ห้ามถามเกี่ยวกับน้ำยาล้างจาน
4. ถ้า objective ไม่ได้กล่าวถึงผลิตภัณฑ์/หัวข้อใดๆ → ห้ามถามเกี่ยวกับสิ่งนั้น
5. คำถามต้องมาจาก objective โดยตรงเท่านั้น

คุณต้องตอบเป็น JSON format เท่านั้น โดยต้องมีฟิลด์ "question" ที่เป็น string และอาจจะมีฟิลด์ "reason" ด้วย`
            : `คุณเป็นผู้สัมภาษณ์มืออาชีพที่ต้องคิดคำถามด้วยความคิดสร้างสรรค์

⚠️ กฎสำคัญที่ต้องปฏิบัติตามเสมอ:
1. อ่าน objective อย่างละเอียดและถามเฉพาะสิ่งที่ระบุใน objective เท่านั้น
2. ห้ามอ้างอิงถึงผลิตภัณฑ์/หัวข้อ/แบรนด์ที่ไม่ได้ระบุใน objective
3. ถ้า objective ไม่ได้กล่าวถึง "น้ำยาล้างจาน" → ห้ามถามเกี่ยวกับน้ำยาล้างจาน
4. ถ้า objective ไม่ได้กล่าวถึงผลิตภัณฑ์/หัวข้อใดๆ → ห้ามถามเกี่ยวกับสิ่งนั้น
5. คำถามต้องมาจาก objective โดยตรงเท่านั้น

กรุณาตอบเป็น JSON format เท่านั้น (ไม่มีข้อความอื่นใดนอกเหนือจาก JSON) โดยต้องมีฟิลด์ "question" ที่เป็น string และอาจจะมีฟิลด์ "reason" ด้วย`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9,
      max_tokens: 500
    }
    
    if (supportsJsonMode(modelToUse)) {
      requestOptions.response_format = { type: 'json_object' }
    }
    
    const completion = await openaiClient.chat.completions.create(requestOptions)

    const aiResponse = completion.choices[0]?.message?.content || '{}'
    console.log('Raw AI Response:', aiResponse.substring(0, 500)) // Log first 500 chars
    
    let result = {}
    
    try {
      result = JSON.parse(aiResponse)
      console.log('Parsed result:', JSON.stringify(result))
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('Full AI Response:', aiResponse)
      // Try to extract question from text if JSON parse fails
      const questionMatch = aiResponse.match(/"question":\s*"([^"]+)"/) || aiResponse.match(/"question"\s*:\s*"([^"]+)"/)
      if (questionMatch && questionMatch[1]) {
        result.question = questionMatch[1]
        console.log('Extracted question from text:', result.question)
      } else {
        // Try to find question without quotes
        const questionMatch2 = aiResponse.match(/question["\s:]*([^"}\n]+)/i)
        if (questionMatch2 && questionMatch2[1]) {
          result.question = questionMatch2[1].trim()
          console.log('Extracted question (alternative):', result.question)
        }
      }
    }

    // Check for alternative field names
    let question = result.question || result.Question || result.questionText || result.text || ''
    
    // If still no question, try to extract from response text more aggressively
    if (!question || question.trim() === '') {
      // Try to find any text that looks like a question
      const questionPatterns = [
        /"question"\s*:\s*"([^"]+)"/i,
        /question["\s:]*([^"}\n]{20,200})/i,
        /(?:คำถาม|question)[:"\s]*([^\n"}{]{20,200})/i
      ]
      
      for (const pattern of questionPatterns) {
        const match = aiResponse.match(pattern)
        if (match && match[1]) {
          question = match[1].trim()
          console.log('Extracted question using pattern:', question.substring(0, 50))
          break
        }
      }
    }
    
    // Validate that AI returned a question
    if (!question || question.trim() === '') {
      console.error('AI did not return a question after all attempts')
      console.error('Full parsed result:', JSON.stringify(result, null, 2))
      console.error('Full AI Response (first 1000 chars):', aiResponse.substring(0, 1000))
      console.error('Full AI Response (last 500 chars):', aiResponse.substring(Math.max(0, aiResponse.length - 500)))
      return res.status(500).json({
        error: 'AI did not generate a question',
        message: 'Please try again or check your prompt settings',
        debug: {
          hasQuestion: !!result.question,
          keys: Object.keys(result),
          responsePreview: aiResponse.substring(0, 500),
          fullResponse: aiResponse
        }
      })
    }

    const finalQuestion = question.trim()
    console.log('Final question:', finalQuestion.substring(0, 100))
    
    res.json({
      success: true,
      question: finalQuestion,
      reason: result.reason || result.Reason || 'Generated by AI based on objective and demographic data',
      model: modelToUse || getSafeModel(getCurrentModel())
    })
  } catch (error) {
    console.error('Error generating first question:', error)
    res.status(500).json({ 
      error: 'Failed to generate first question',
      message: error.message 
    })
  }
})

// Phase 3: Analyze answer and generate probe question
app.post('/api/analyze-answer', async (req, res) => {
  try {
    // Validate and sanitize input
    const validation = validateAnalyzeAnswerRequest(req.body)
    if (!validation.valid) {
      return res.status(400).json({ 
        error: 'Validation failed',
        errors: validation.errors
      })
    }
    
    const { answer, previousQuestions, objective, demographicData, desiredInsights, keyQuestions, hypothesis, currentTopic, customPrompt, questionCount, currentQuestionCount, model } = validation.sanitized

    // Format demographic data
    const demographicText = demographicData && Object.keys(demographicData).length > 0
      ? Object.entries(demographicData)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : 'ไม่มีข้อมูล'

    // Check if we've reached the question limit
    if (questionCount && currentQuestionCount && currentQuestionCount >= questionCount) {
      return res.json({
        success: true,
        analysis: {
          sentiment: 'neutral',
          keyPoints: [],
          needsProbing: false,
          reason: 'ถึงจำนวนคำถามที่กำหนดแล้ว'
        },
        nextAction: {
          type: 'complete',
          question: '',
          reason: 'ถึงจำนวนคำถามที่กำหนดแล้ว'
        },
        model: modelToUse || getSafeModel(getCurrentModel())
      })
    }

    // Get prompt from customPrompt, database, or use empty (will fail if no prompt)
    let prompt = customPrompt
    if (!prompt) {
      try {
        const settings = await SettingsModel.getAIPromptSettings()
        prompt = settings?.interviewPrompt || null
      } catch (error) {
        console.error('Error fetching prompt settings:', error)
      }
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt template available. Please configure AI prompts in Settings page first.' 
      })
    }

    // Replace placeholders
    prompt = prompt.replace(/\{objective\}/g, objective || 'ไม่ระบุ')
    prompt = prompt.replace(/\{desiredInsights\}/g, desiredInsights || 'ไม่ระบุ')
    prompt = prompt.replace(/\{keyQuestions\}/g, keyQuestions || 'ไม่ระบุ')
    prompt = prompt.replace(/\{hypothesis\}/g, hypothesis || 'ไม่ระบุ')
    prompt = prompt.replace(/\{demographicData\}/g, demographicText)
    prompt = prompt.replace(/\{currentTopic\}/g, currentTopic || 'ไม่ระบุ')
    prompt = prompt.replace(/\{previousQuestions\}/g, previousQuestions?.join(', ') || 'ไม่มี')
    prompt = prompt.replace(/\{answer\}/g, answer)

    const openaiClient = getOpenAI()
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    
    const requestOptions = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: supportsJsonMode(modelToUse)
            ? 'คุณเป็นผู้สัมภาษณ์มืออาชีพที่ต้องวิเคราะห์คำตอบและคิดคำถามต่อยอดด้วยความคิดสร้างสรรค์ ไม่ใช้ templates หรือ patterns สำเร็จรูป ตอบเป็น JSON format เท่านั้น'
            : 'คุณเป็นผู้สัมภาษณ์มืออาชีพที่ต้องวิเคราะห์คำตอบและคิดคำถามต่อยอดด้วยความคิดสร้างสรรค์ ไม่ใช้ templates หรือ patterns สำเร็จรูป กรุณาตอบเป็น JSON format เท่านั้น (ไม่มีข้อความอื่นใดนอกเหนือจาก JSON)'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.9
    }
    
    if (supportsJsonMode(modelToUse)) {
      requestOptions.response_format = { type: 'json_object' }
    }
    
    const completion = await openaiClient.chat.completions.create(requestOptions)

    const aiResponse = completion.choices[0]?.message?.content || '{}'
    let result = {}
    
    try {
      result = JSON.parse(aiResponse)
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      console.error('AI Response:', aiResponse)
    }

    // Validate that AI returned a question if needed
    if (result.nextAction && (result.nextAction.type === 'probe' || result.nextAction.type === 'next_question')) {
      if (!result.nextAction.question || result.nextAction.question.trim() === '') {
        console.error('AI did not return a question for probe/next_question')
        console.error('Result from AI:', JSON.stringify(result))
        return res.status(500).json({
          error: 'AI did not generate a question',
          message: 'Please try again or check your prompt settings'
        })
      }
    }

    res.json({
      success: true,
      ...result,
      model: modelToUse || getSafeModel(getCurrentModel())
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error analyzing answer:', error)
    }
    
    const errorMessage = error.message || 'ไม่สามารถวิเคราะห์คำตอบได้'
    res.status(500).json({ 
      error: 'Failed to analyze answer',
      message: errorMessage 
    })
  }
})

// Generate Insights from interview transcript
app.post('/api/generate-insights', async (req, res) => {
  try {
    const { transcript, objective, desiredInsights, keyQuestions, hypothesis, customPrompt, model } = req.body

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Transcript is required' })
    }

    const transcriptText = transcript
      .map(item => `${item.speaker === 'Interviewer' ? 'ผู้สัมภาษณ์' : 'ผู้ถูกสัมภาษณ์'}: ${item.text}`)
      .join('\n')

    // Get prompt from customPrompt, database, or use empty (will fail if no prompt)
    let prompt = customPrompt
    if (!prompt) {
      try {
        const settings = await SettingsModel.getAIPromptSettings()
        prompt = settings?.insightPrompt || null
      } catch (error) {
        console.error('Error fetching prompt settings:', error)
      }
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt template available. Please configure AI prompts in Settings page first.' 
      })
    }

    // Replace placeholders
    prompt = prompt.replace(/\{objective\}/g, objective || 'ไม่ระบุ')
    prompt = prompt.replace(/\{desiredInsights\}/g, desiredInsights || 'ไม่ระบุ')
    prompt = prompt.replace(/\{keyQuestions\}/g, keyQuestions || 'ไม่ระบุ')
    prompt = prompt.replace(/\{hypothesis\}/g, hypothesis || 'ไม่ระบุ')
    prompt = prompt.replace(/\{transcript\}/g, transcriptText)

    const openaiClient = getOpenAI()
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    
    const requestOptions = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: supportsJsonMode(modelToUse)
            ? 'คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์และสรุปข้อมูลการสัมภาษณ์ ตอบเป็น JSON format เท่านั้น'
            : 'คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์และสรุปข้อมูลการสัมภาษณ์ กรุณาตอบเป็น JSON format เท่านั้น (ไม่มีข้อความอื่นใดนอกเหนือจาก JSON)'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    }
    
    if (supportsJsonMode(modelToUse)) {
      requestOptions.response_format = { type: 'json_object' }
    }
    
    const completion = await openaiClient.chat.completions.create(requestOptions)

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    res.json({
      success: true,
      ...result,
      model: modelToUse || getSafeModel(getCurrentModel())
    })
  } catch (error) {
    console.error('Error generating insights:', error)
    res.status(500).json({ 
      error: 'Failed to generate insights',
      message: error.message 
    })
  }
})

// Chat AI - Ask questions about the research
app.post('/api/chat-ai', async (req, res) => {
  try {
    const { userQuestion, transcript, objective, desiredInsights, keyQuestions, hypothesis, demographicData, customPrompt, model, contextData } = req.body

    if (!userQuestion) {
      return res.status(400).json({ error: 'Question is required' })
    }

    const transcriptText = transcript && Array.isArray(transcript)
      ? transcript.map(item => `${item.speaker === 'Interviewer' ? 'ผู้สัมภาษณ์' : 'ผู้ถูกสัมภาษณ์'}: ${item.text}`).join('\n')
      : 'ไม่มีข้อมูล'

    const demographicText = demographicData && Object.keys(demographicData).length > 0
      ? Object.entries(demographicData).map(([key, value]) => `${key}: ${value}`).join('\n')
      : 'ไม่มีข้อมูล'

    // Build context from contextData if available
    let contextText = ''
    if (contextData) {
      const ctx = contextData
      if (ctx.analytics) {
        contextText += `\nข้อมูลสถิติ:\n- จำนวนการสัมภาษณ์ทั้งหมด: ${ctx.analytics.total_interviews || 0}\n`
        if (ctx.analytics.top_themes && ctx.analytics.top_themes.length > 0) {
          contextText += `- Themes ที่ได้รับความนิยม: ${ctx.analytics.top_themes.map((t) => `${t.theme_name_th} (${t.mention_count} ครั้ง)`).join(', ')}\n`
        }
        if (ctx.analytics.brand_mentions && ctx.analytics.brand_mentions.length > 0) {
          contextText += `- แบรนด์ที่ถูกกล่าวถึง: ${ctx.analytics.brand_mentions.map((b) => `${b.brand_name} (${b.interview_count} ครั้ง)`).join(', ')}\n`
        }
      }
      if (ctx.themesData && ctx.themesData.length > 0) {
        contextText += `\nTheme Distribution:\n${ctx.themesData.map((t) => `- ${t.name}: ${t.total} mentions (Positive: ${t.Positive}, Mixed: ${t.Mixed}, Negative: ${t.Negative}, Neutral: ${t.Neutral})`).join('\n')}\n`
      }
      if (ctx.brandData && ctx.brandData.length > 0) {
        contextText += `\nแบรนด์ที่ถูกกล่าวถึง:\n${ctx.brandData.map((b) => `- ${b.name}: ${b.value} ครั้ง`).join('\n')}\n`
      }
      if (ctx.insightsData && ctx.insightsData.length > 0) {
        contextText += `\nInsights:\n${ctx.insightsData.slice(0, 5).map((i) => `- ${i.role}: want=${i.want}, but=${i.but}, so=${i.so}`).join('\n')}\n`
      }
      if (ctx.themesTableData && ctx.themesTableData.length > 0) {
        contextText += `\nรายละเอียด Themes:\n${ctx.themesTableData.slice(0, 10).map((t) => `- Theme ${t.theme_id}: ${t.theme_name_th} (${t.mention_count} ครั้ง)`).join('\n')}\n`
      }
    }

    // Get prompt from customPrompt, database, or use empty (will fail if no prompt)
    let prompt = customPrompt
    if (!prompt) {
      try {
        const settings = await SettingsModel.getAIPromptSettings()
        prompt = settings?.chatAIPrompt || null
      } catch (error) {
        console.error('Error fetching prompt settings:', error)
      }
    }

    if (!prompt) {
      return res.status(400).json({ 
        error: 'No prompt template available. Please configure AI prompts in Settings page first.' 
      })
    }

    // Replace placeholders
    prompt = prompt.replace(/\{objective\}/g, objective || 'ไม่ระบุ')
    prompt = prompt.replace(/\{desiredInsights\}/g, desiredInsights || 'ไม่ระบุ')
    prompt = prompt.replace(/\{keyQuestions\}/g, keyQuestions || 'ไม่ระบุ')
    prompt = prompt.replace(/\{hypothesis\}/g, hypothesis || 'ไม่ระบุ')
    prompt = prompt.replace(/\{transcript\}/g, transcriptText)
    prompt = prompt.replace(/\{demographicData\}/g, demographicText)
    prompt = prompt.replace(/\{userQuestion\}/g, userQuestion)
    
    // Add context data to prompt if available
    if (contextText) {
      prompt += `\n\nข้อมูลเพิ่มเติมจาก Dashboard:\n${contextText}\n`
    }

    const openaiClient = getOpenAI()
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    
    const requestOptions = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: supportsJsonMode(modelToUse)
            ? 'คุณเป็นผู้ช่วย AI สำหรับตอบคำถามเกี่ยวกับการวิจัย ตอบเป็น JSON format เท่านั้น'
            : 'คุณเป็นผู้ช่วย AI สำหรับตอบคำถามเกี่ยวกับการวิจัย กรุณาตอบเป็น JSON format เท่านั้น (ไม่มีข้อความอื่นใดนอกเหนือจาก JSON)'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    }
    
    if (supportsJsonMode(modelToUse)) {
      requestOptions.response_format = { type: 'json_object' }
    }
    
    const completion = await openaiClient.chat.completions.create(requestOptions)

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    res.json({
      success: true,
      ...result,
      model: modelToUse || getSafeModel(getCurrentModel())
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error in chat AI:', error)
    }
    
    const errorMessage = error.message || 'ไม่สามารถประมวลผลคำถามได้'
    res.status(500).json({ 
      error: 'Failed to process chat request',
      message: errorMessage 
    })
  }
})

// Phase 4: Analyze interview results (Pattern, Sentiment, Demographics)
app.post('/api/analyze-results', async (req, res) => {
  try {
    const { transcript, objective, model } = req.body

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Transcript is required' })
    }

    const transcriptText = transcript
      .map(item => `${item.speaker === 'Interviewer' ? 'ผู้สัมภาษณ์' : 'ผู้ถูกสัมภาษณ์'}: ${item.text}`)
      .join('\n')

    const prompt = `คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ข้อมูลการสัมภาษณ์

วัตถุประสงค์: ${objective || 'ไม่ระบุ'}

บันทึกการสัมภาษณ์:
${transcriptText}

กรุณาวิเคราะห์และตอบในรูปแบบ JSON:

{
  "summary": "สรุปภาพรวมของการสัมภาษณ์ (2-3 ประโยค)",
  "patterns": [
    {
      "theme": "หัวข้อ/ธีม",
      "frequency": 5,
      "examples": ["ตัวอย่าง 1", "ตัวอย่าง 2"],
      "description": "อธิบาย pattern นี้"
    }
  ],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "breakdown": [
      {
        "topic": "หัวข้อ",
        "sentiment": "positive|neutral|negative",
        "intensity": 0.8,
        "evidence": "หลักฐานจาก transcript"
      }
    ]
  },
  "demographics": {
    "ageRange": "ช่วงอายุที่พบ",
    "gender": "เพศที่พบ",
    "behaviors": ["พฤติกรรมที่พบ", "พฤติกรรม 2"],
    "characteristics": ["ลักษณะเด่น", "ลักษณะ 2"]
  },
  "insights": [
    "Insight สำคัญ 1",
    "Insight สำคัญ 2",
    "Insight สำคัญ 3"
  ],
  "painPoints": [
    "Pain point 1",
    "Pain point 2"
  ],
  "recommendations": [
    "ข้อเสนอแนะ 1",
    "ข้อเสนอแนะ 2"
  ]
}

กรุณาตอบเป็น JSON เท่านั้น`

    const openaiClient = getOpenAI()
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    
    const requestOptions = {
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: supportsJsonMode(modelToUse)
            ? 'คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ข้อมูลการสัมภาษณ์ ตอบเป็น JSON format เท่านั้น'
            : 'คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ข้อมูลการสัมภาษณ์ กรุณาตอบเป็น JSON format เท่านั้น (ไม่มีข้อความอื่นใดนอกเหนือจาก JSON)'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    }
    
    if (supportsJsonMode(modelToUse)) {
      requestOptions.response_format = { type: 'json_object' }
    }
    
    const completion = await openaiClient.chat.completions.create(requestOptions)

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')

    res.json({
      success: true,
      ...result,
      model: modelToUse || getSafeModel(getCurrentModel())
    })
  } catch (error) {
    console.error('Error analyzing results:', error)
    res.status(500).json({ 
      error: 'Failed to analyze results',
      message: error.message 
    })
  }
})

// Summarize interview data using OpenAI
app.post('/api/interviews/:id/summarize', async (req, res) => {
  try {
    const { id } = req.params
    const { transcript, topic, segment, key_focus } = req.body

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Transcript is required' })
    }

    // Format transcript for OpenAI
    const transcriptText = transcript
      .map(item => `${item.speaker === 'Interviewer' ? 'ผู้สัมภาษณ์' : 'ผู้ถูกสัมภาษณ์'}: ${item.text}`)
      .join('\n')

    // Create prompt for summarization
    const prompt = `คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์ข้อมูลการสัมภาษณ์ กรุณาสรุปข้อมูลการสัมภาษณ์ต่อไปนี้:

หัวข้อ: ${topic || 'ไม่ระบุ'}
กลุ่มเป้าหมาย: ${segment || 'ไม่ระบุ'}
จุดเน้น: ${key_focus || 'ไม่ระบุ'}

บันทึกการสัมภาษณ์:
${transcriptText}

กรุณาสรุปข้อมูลในรูปแบบต่อไปนี้:
1. สรุปภาพรวม (2-3 ประโยค)
2. จุดเด่น/ประเด็นสำคัญ (3-5 ข้อ)
3. ความต้องการ/ความคาดหวังของผู้ถูกสัมภาษณ์
4. ข้อเสนอแนะ/Insights

กรุณาตอบเป็นภาษาไทยและให้ข้อมูลที่กระชับและมีประโยชน์`

    const openaiClient = getOpenAI()
    const requestedModel = model || getCurrentModel()
    const modelToUse = getSafeModel(requestedModel)
    const completion = await openaiClient.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: 'คุณเป็นผู้เชี่ยวชาญในการวิเคราะห์และสรุปข้อมูลการสัมภาษณ์ ตอบเป็นภาษาไทย'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })

    const summary = completion.choices[0]?.message?.content || 'ไม่สามารถสรุปข้อมูลได้'

    res.json({
      success: true,
      summary,
      model: modelToUse || getSafeModel(getCurrentModel())
    })
  } catch (error) {
    console.error('Error summarizing interview:', error)
    res.status(500).json({ 
      error: 'Failed to summarize interview',
      message: error.message 
    })
  }
})

// Update card with data from data.json (for importing interview data)
app.post('/api/cards/:id/import', (req, res) => {
  const targetId = req.params.id
  const interviews = loadInterviews()
  const interview = interviews[0] // Use first interview (P1) as template

  if (!interview) {
    return res.status(404).json({ error: 'Interview data not found' })
  }

  // Convert interview data to Card format
  const cardData = {
    id: targetId,
    title: interview.topic,
    body: `${interview.topic}\n\n${interview.key_focus}\n\n${interview.persona.description}`,
    surveyName: interview.topic,
    target: interview.persona.description,
    topic: interview.topic,
    questionCount: interview.transcript.filter(t => t.speaker === 'Interviewer').length,
    aiModel: 'gpt-4'
  }

  // Interview result data for Dashboard
  const interviewResult = {
    id: targetId,
    segment: interview.segment,
    key_focus: interview.key_focus,
    topic: interview.topic,
    persona: interview.persona,
    transcript: interview.transcript
  }

  res.json({
    success: true,
    cardData,
    interviewResult,
    message: 'Data prepared for import'
  })
})

// ============================================
// Database API Endpoints
// ============================================

// Cards API
app.get('/api/cards', async (req, res) => {
  try {
    const cards = await CardsModel.getAllCards()
    res.json(cards)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching cards:', error)
    }
    res.status(500).json({ error: 'Failed to fetch cards', message: error.message })
  }
})

app.get('/api/cards/:id', async (req, res) => {
  try {
    const card = await CardsModel.getCardById(req.params.id)
    if (!card) {
      return res.status(404).json({ error: 'Card not found' })
    }
    res.json(card)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching card:', error)
    }
    res.status(500).json({ error: 'Failed to fetch card', message: error.message })
  }
})

app.post('/api/cards', async (req, res) => {
  try {
    const card = await CardsModel.createCard(req.body)
    res.status(201).json(card)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error creating card:', error)
    }
    res.status(500).json({ error: 'Failed to create card', message: error.message })
  }
})

app.put('/api/cards/:id', async (req, res) => {
  try {
    const card = await CardsModel.updateCard(req.params.id, req.body)
    if (!card) {
      return res.status(404).json({ error: 'Card not found' })
    }
    res.json(card)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error updating card:', error)
    }
    res.status(500).json({ error: 'Failed to update card', message: error.message })
  }
})

app.delete('/api/cards/:id', async (req, res) => {
  try {
    await CardsModel.deleteCard(req.params.id)
    res.json({ success: true, message: 'Card deleted successfully' })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error deleting card:', error)
    }
    res.status(500).json({ error: 'Failed to delete card', message: error.message })
  }
})

app.get('/api/cards/search', async (req, res) => {
  try {
    const query = req.query.q || ''
    const cards = await CardsModel.searchCards(query)
    res.json(cards)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error searching cards:', error)
    }
    res.status(500).json({ error: 'Failed to search cards', message: error.message })
  }
})

// Interview Results API - Legacy endpoint (kept for backward compatibility)
// Note: This route conflicts with /api/interviews/:id above, so use /api/interviews/by-card/:cardId instead
app.get('/api/interviews/:cardId', async (req, res) => {
  try {
    // Check if cardId looks like a timestamp (long number) - if so, it's likely a cardId
    // Otherwise, it might be an interview ID
    const cardId = req.params.cardId;
    if (/^\d{10,}$/.test(cardId)) {
      // Looks like a timestamp/cardId - fetch by cardId
      const interviews = await InterviewsModel.getInterviewResultsByCardId(cardId)
      return res.json(interviews)
    } else {
      // Might be an interview ID - try to get from database first
      try {
        const interview = await InterviewsModel.getInterviewResultById(cardId)
        if (interview) {
          return res.json([interview]) // Return as array for consistency
        }
      } catch (dbError) {
        // If database lookup fails, fall through to 404
      }
      return res.status(404).json({ error: 'Interview not found' })
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching interviews:', error)
    }
    res.status(500).json({ error: 'Failed to fetch interviews', message: error.message })
  }
})

app.post('/api/interviews', async (req, res) => {
  try {
    const interview = await InterviewsModel.createInterviewResult(req.body)
    res.status(201).json(interview)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error creating interview:', error)
    }
    res.status(500).json({ error: 'Failed to create interview', message: error.message })
  }
})

app.put('/api/interviews/:id', async (req, res) => {
  try {
    const interview = await InterviewsModel.updateInterviewResult(req.params.id, req.body)
    if (!interview) {
      return res.status(404).json({ error: 'Interview not found' })
    }
    res.json(interview)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error updating interview:', error)
    }
    res.status(500).json({ error: 'Failed to update interview', message: error.message })
  }
})

app.delete('/api/interviews/:id', async (req, res) => {
  try {
    await InterviewsModel.deleteInterviewResult(req.params.id)
    res.json({ success: true, message: 'Interview deleted successfully' })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error deleting interview:', error)
    }
    res.status(500).json({ error: 'Failed to delete interview', message: error.message })
  }
})

// Interview Sessions API
app.post('/api/interview-sessions', async (req, res) => {
  try {
    const session = await InterviewsModel.createInterviewSession(req.body)
    res.status(201).json(session)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error creating interview session:', error)
    }
    res.status(500).json({ error: 'Failed to create interview session', message: error.message })
  }
})

app.get('/api/interview-sessions/:cardId', async (req, res) => {
  try {
    const sessions = await InterviewsModel.getInterviewSessionsByCardId(req.params.cardId)
    res.json(sessions)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching interview sessions:', error)
    }
    res.status(500).json({ error: 'Failed to fetch interview sessions', message: error.message })
  }
})

// Executive Summary API - Generate AI-powered executive summary
app.get('/api/insights/executive-summary', async (req, res) => {
  try {
    const { cardId } = req.query;
    
    // Get OpenAI client with API key from system
    const openai = getOpenAI();
    const apiKey = getApiKey('openai');
    if (!apiKey || apiKey === 'dummy-key') {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key not configured',
        message: 'Please configure OpenAI API key in AI Settings'
      });
    }

    // Fetch data from database based on cardId
    let interviews = [];
    let themesData = [];
    let brandsData = [];
    
    if (cardId) {
      // Fetch interview results for this card
      interviews = await InterviewsModel.getInterviewResultsByCardId(cardId);
      
      // If no results, try interview sessions
      if (interviews.length === 0) {
        const sessions = await InterviewsModel.getInterviewSessionsByCardId(cardId);
        interviews = sessions;
      }
    } else {
      // If no cardId, fetch all interviews (for backward compatibility)
      interviews = await InterviewsModel.getAllInterviewResults();
    }

    if (interviews.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No interview data found',
        message: cardId ? `No interviews found for card ${cardId}` : 'No interviews found'
      });
    }

    // Extract themes and brands from interview transcripts
    const themesMap = new Map();
    const brandsMap = new Map();
    let totalAge = 0;
    let ageCount = 0;
    
    interviews.forEach((interview) => {
      const transcript = interview.transcript || interview.messages || [];
      const text = Array.isArray(transcript) 
        ? transcript.map((msg) => typeof msg === 'string' ? msg : (msg.text || msg.content || '')).join(' ')
        : '';
      
      // Extract themes (Thai words)
      const thaiWords = text.match(/[\u0E00-\u0E7F]{2,}/g) || [];
      thaiWords.forEach((word) => {
        if (word.length >= 2) {
          themesMap.set(word, (themesMap.get(word) || 0) + 1);
        }
      });
      
      // Extract brands (capitalized words)
      const words = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
      words.forEach((word) => {
        if (word.length >= 3 && !['The', 'This', 'That', 'With', 'From', 'When', 'Where', 'What', 'How'].includes(word)) {
          brandsMap.set(word, (brandsMap.get(word) || 0) + 1);
        }
      });
      
      // Extract age if available
      const demographicData = interview.demographicData || interview.persona?.features || {};
      if (demographicData.age) {
        totalAge += parseInt(demographicData.age) || 0;
        ageCount++;
      }
    });

    // Prepare data context
    const topThemes = Array.from(themesMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
    
    const topBrands = Array.from(brandsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);

    const dataContext = {
      total_interviews: interviews.length,
      avg_age: ageCount > 0 ? Math.round(totalAge / ageCount) : 0,
      top_positive_themes: topThemes.slice(0, 5),
      top_concerns: topThemes.slice(5, 10),
      top_brands: topBrands.slice(0, 5)
    };

    // Generate executive summary using OpenAI
    const prompt = `คุณเป็นนักวิเคราะห์ข้อมูลผู้เชี่ยวชาญ กรุณาสร้างบทสรุปผู้บริหาร (Executive Summary) จากข้อมูลการสัมภาษณ์ต่อไปนี้:

ข้อมูลพื้นฐาน:
- จำนวนการสัมภาษณ์: ${dataContext.total_interviews}
- อายุเฉลี่ย: ${dataContext.avg_age} ปี
- Themes ที่พบมากที่สุด: ${topThemes.join(', ')}
- Brands ที่ถูกกล่าวถึง: ${topBrands.join(', ')}

ข้อมูลการสัมภาษณ์:
${interviews.slice(0, 5).map((interview, idx) => {
  const transcript = interview.transcript || interview.messages || [];
  const text = Array.isArray(transcript) 
    ? transcript.map((msg) => typeof msg === 'string' ? msg : (msg.text || msg.content || '')).join(' ')
    : '';
  return `สัมภาษณ์ ${idx + 1}:\n${text.substring(0, 500)}...`;
}).join('\n\n')}

กรุณาสร้างบทสรุปผู้บริหารที่ครอบคลุม:
1. สรุปภาพรวม (Overview)
2. ข้อค้นพบสำคัญ (Key Findings) - 3-5 ข้อ
3. ข้อเสนอแนะ (Recommendations)

ใช้ภาษาไทยที่ชัดเจนและเป็นมืออาชีพ`;

    const model = getActiveModel() || 'gpt-4o-mini';
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: 'system', content: 'You are a professional data analyst. Respond in Thai language.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const summary = completion.choices[0]?.message?.content || 'ไม่สามารถสร้างบทสรุปได้';

    // Extract key findings from summary
    const keyFindings = [];
    const findingsMatch = summary.match(/ข้อค้นพบสำคัญ|Key Findings|[\d+\.]\s*(.+?)(?=\n|$)/gi);
    if (findingsMatch) {
      findingsMatch.slice(0, 5).forEach((finding, idx) => {
        const cleanFinding = finding.replace(/^[\d+\.\s]*/, '').trim();
        if (cleanFinding.length > 10) {
          keyFindings.push({
            title: `ข้อค้นพบ ${idx + 1}`,
            description: cleanFinding,
            opportunity: ''
          });
        }
      });
    }

    res.json({
      success: true,
      summary: summary,
      data_context: dataContext,
      key_findings: keyFindings.length > 0 ? keyFindings : [
        {
          title: 'ข้อมูลจากการสัมภาษณ์',
          description: `พบ ${dataContext.total_interviews} การสัมภาษณ์ โดยมี themes หลักคือ ${topThemes.slice(0, 3).join(', ')}`,
          opportunity: 'ควรวิเคราะห์ข้อมูลเพิ่มเติมเพื่อหาข้อเสนอแนะที่ชัดเจน'
        }
      ]
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error generating executive summary:', error);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to generate executive summary',
      message: error.message
    });
  }
});

// AI Prompt Settings API
// Get AI Config Settings
app.get('/api/settings/ai-config', async (req, res) => {
  try {
    const settings = await SettingsModel.getAIConfigSettings()
    if (settings) {
      res.json(settings)
    } else {
      // Return default values
      res.json({
        microAiVersion: 'v1',
        ruleConfidenceBase: 0.45,
        llmConfidenceBoost: 0.25,
        themeSimilarityThreshold: 0.78,
        minSupportSessions: 3,
        credibilityWeightSupport: 0.6,
        credibilityWeightConfidence: 0.2,
        credibilityWeightSaturation: 0.2
      })
    }
  } catch (error) {
    console.error('Error fetching AI config settings:', error)
    res.status(500).json({ error: 'Failed to fetch AI config settings' })
  }
})

// Save AI Config Settings
app.post('/api/settings/ai-config', async (req, res) => {
  try {
    const {
      microAiVersion,
      ruleConfidenceBase,
      llmConfidenceBoost,
      themeSimilarityThreshold,
      minSupportSessions,
      credibilityWeightSupport,
      credibilityWeightConfidence,
      credibilityWeightSaturation
    } = req.body

    await SettingsModel.saveAIConfigSettings({
      microAiVersion,
      ruleConfidenceBase,
      llmConfidenceBoost,
      themeSimilarityThreshold,
      minSupportSessions,
      credibilityWeightSupport,
      credibilityWeightConfidence,
      credibilityWeightSaturation
    })

    res.json({ success: true, message: 'AI config settings saved successfully' })
  } catch (error) {
    console.error('Error saving AI config settings:', error)
    res.status(500).json({ error: 'Failed to save AI config settings', message: error.message })
  }
})

app.get('/api/settings/prompts', async (req, res) => {
  try {
    const settings = await SettingsModel.getAIPromptSettings()
    res.json(settings || {
      demographicPrompt: '',
      interviewPrompt: '',
      insightPrompt: '',
      chatAIPrompt: ''
    })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching settings:', error)
    }
    res.status(500).json({ error: 'Failed to fetch settings', message: error.message })
  }
})

app.post('/api/settings/prompts', async (req, res) => {
  try {
    const settings = await SettingsModel.saveAIPromptSettings(req.body)
    res.json(settings)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error saving settings:', error)
    }
    res.status(500).json({ error: 'Failed to save settings', message: error.message })
  }
})

// ============ Demo Dashboard API Proxy ============
// Proxy endpoints to connect to database_generate API
// These endpoints forward requests to the FastAPI server running on port 8000

const DEMO_API_BASE_URL = process.env.DEMO_API_URL || 'http://localhost:8000'

// Helper function to proxy requests to demo API
async function proxyToDemoAPI(path, options = {}) {
  const url = `${DEMO_API_BASE_URL}${path}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      // Add timeout
      signal: AbortSignal.timeout(10000) // 10 second timeout
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Demo API error: ${response.status} - ${errorText}`)
    }
    
    return response.json()
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error('Request timeout: Database API server may not be running')
    }
    if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      throw new Error('Cannot connect to database API server. Please make sure it is running on port 8000')
    }
    throw error
  }
}

// Get all segments
app.get('/api/demo/segments', async (req, res) => {
  try {
    const data = await proxyToDemoAPI('/segments')
    res.json(data)
  } catch (error) {
    console.error('Error fetching segments:', error)
    const statusCode = error.message?.includes('Cannot connect') || error.message?.includes('timeout') ? 503 : 500
    res.status(statusCode).json({ 
      error: 'Failed to fetch segments', 
      message: error.message || 'Database API server may not be running. Please start it on port 8000.'
    })
  }
})

// Get all interviews
app.get('/api/demo/interviews', async (req, res) => {
  try {
    const segmentId = req.query.segment_id
    const status = req.query.status
    const path = `/interviews${segmentId ? `?segment_id=${segmentId}` : ''}${status ? `${segmentId ? '&' : '?'}status=${status}` : ''}`
    const data = await proxyToDemoAPI(path)
    res.json(data)
  } catch (error) {
    console.error('Error fetching interviews:', error)
    const statusCode = error.message?.includes('Cannot connect') || error.message?.includes('timeout') ? 503 : 500
    res.status(statusCode).json({ 
      error: 'Failed to fetch interviews', 
      message: error.message || 'Database API server may not be running. Please start it on port 8000.'
    })
  }
})

// Get interview detail
app.get('/api/demo/interviews/:interviewId', async (req, res) => {
  try {
    const data = await proxyToDemoAPI(`/interviews/${req.params.interviewId}`)
    res.json(data)
  } catch (error) {
    console.error('Error fetching interview detail:', error)
    res.status(500).json({ error: 'Failed to fetch interview detail', message: error.message })
  }
})

// Get all personas
app.get('/api/demo/personas', async (req, res) => {
  try {
    const role = req.query.role
    const minAge = req.query.min_age
    const maxAge = req.query.max_age
    const params = new URLSearchParams()
    if (role) params.append('role', role)
    if (minAge) params.append('min_age', minAge)
    if (maxAge) params.append('max_age', maxAge)
    const path = `/personas${params.toString() ? `?${params.toString()}` : ''}`
    const data = await proxyToDemoAPI(path)
    res.json(data)
  } catch (error) {
    console.error('Error fetching personas:', error)
    const statusCode = error.message?.includes('Cannot connect') || error.message?.includes('timeout') ? 503 : 500
    res.status(statusCode).json({ 
      error: 'Failed to fetch personas', 
      message: error.message || 'Database API server may not be running. Please start it on port 8000.'
    })
  }
})

// Get all brands
app.get('/api/demo/brands', async (req, res) => {
  try {
    const data = await proxyToDemoAPI('/brands')
    res.json(data)
  } catch (error) {
    console.error('Error fetching brands:', error)
    const statusCode = error.message?.includes('Cannot connect') || error.message?.includes('timeout') ? 503 : 500
    res.status(statusCode).json({ 
      error: 'Failed to fetch brands', 
      message: error.message || 'Database API server may not be running. Please start it on port 8000.'
    })
  }
})

// Get brand detail
app.get('/api/demo/brands/:brandId', async (req, res) => {
  try {
    const data = await proxyToDemoAPI(`/brands/${req.params.brandId}`)
    res.json(data)
  } catch (error) {
    console.error('Error fetching brand detail:', error)
    res.status(500).json({ error: 'Failed to fetch brand detail', message: error.message })
  }
})

// Get all themes
app.get('/api/demo/themes', async (req, res) => {
  try {
    const data = await proxyToDemoAPI('/themes')
    res.json(data)
  } catch (error) {
    console.error('Error fetching themes:', error)
    res.status(500).json({ error: 'Failed to fetch themes', message: error.message })
  }
})

// Get theme insights
app.get('/api/demo/themes/:themeId', async (req, res) => {
  try {
    const data = await proxyToDemoAPI(`/themes/${req.params.themeId}`)
    res.json(data)
  } catch (error) {
    console.error('Error fetching theme insights:', error)
    res.status(500).json({ error: 'Failed to fetch theme insights', message: error.message })
  }
})

// Get transcript
app.get('/api/demo/transcripts/:interviewId', async (req, res) => {
  try {
    const data = await proxyToDemoAPI(`/transcripts/${req.params.interviewId}`)
    res.json(data)
  } catch (error) {
    console.error('Error fetching transcript:', error)
    res.status(500).json({ error: 'Failed to fetch transcript', message: error.message })
  }
})

// Get analytics summary
app.get('/api/demo/analytics/summary', async (req, res) => {
  try {
    const data = await proxyToDemoAPI('/analytics/summary')
    res.json(data)
  } catch (error) {
    console.error('Error fetching analytics summary:', error)
    const statusCode = error.message?.includes('Cannot connect') || error.message?.includes('timeout') ? 503 : 500
    res.status(statusCode).json({ 
      error: 'Failed to fetch analytics summary', 
      message: error.message || 'Database API server may not be running. Please start it on port 8000.'
    })
  }
})

// Chat API - Ask question (with AI using OpenAI from Settings)
app.post('/api/demo/chat/ask', async (req, res) => {
  try {
    const { message, selected_tables } = req.body
    
    // First, forward to demo API to get SQL query and data
    const demoResponse = await proxyToDemoAPI('/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ message, selected_tables })
    })
    
    // If demo API returns data, use OpenAI to generate report
    if (demoResponse.data && demoResponse.data.length > 0) {
      const apiKey = getApiKey('openai')
      if (apiKey && apiKey !== 'dummy-key') {
        try {
          const openaiClient = getOpenAI()
          const modelToUse = 'gpt-4o-mini' // Use gpt-4o-mini as requested
          
          // Generate AI report from the data
          const dataSummary = JSON.stringify(demoResponse.data.slice(0, 20), null, 2)
          const prompt = `คุณเป็นนักวิเคราะห์ข้อมูล กรุณาวิเคราะห์และสรุปข้อมูลต่อไปนี้เป็นภาษาไทย:

ข้อมูล:
${dataSummary}

กรุณาให้:
1. สรุปภาพรวมของข้อมูล
2. ข้อค้นพบสำคัญ (3-5 ข้อ)
3. ข้อเสนอแนะ (ถ้ามี)

ใช้ภาษาไทยที่ชัดเจนและเป็นมืออาชีพ`

          const completion = await openaiClient.chat.completions.create({
            model: modelToUse,
            messages: [
              {
                role: 'system',
                content: 'คุณเป็นนักวิเคราะห์ข้อมูลมืออาชีพ ตอบเป็นภาษาไทย'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })

          demoResponse.report = completion.choices[0]?.message?.content || null
        } catch (aiError) {
          console.error('Error generating AI report:', aiError)
          // Continue without AI report
        }
      }
    }
    
    res.json(demoResponse)
  } catch (error) {
    console.error('Error in chat ask:', error)
    res.status(500).json({ error: 'Failed to process chat request', message: error.message })
  }
})

// Chat API - Get suggestions
app.get('/api/demo/chat/suggestions', async (req, res) => {
  try {
    const data = await proxyToDemoAPI('/chat/suggestions')
    res.json(data)
  } catch (error) {
    console.error('Error fetching chat suggestions:', error)
    res.status(500).json({ error: 'Failed to fetch suggestions', message: error.message })
  }
})

// Chat API - Get tables
app.get('/api/demo/chat/tables', async (req, res) => {
  try {
    const data = await proxyToDemoAPI('/chat/tables')
    res.json(data)
  } catch (error) {
    console.error('Error fetching chat tables:', error)
    res.status(500).json({ error: 'Failed to fetch tables', message: error.message })
  }
})

// Update personas to Thai language (runs update_personas_thai.py script)
app.post('/api/demo/personas/update-thai', async (req, res) => {
  try {
    const scriptPath = join(__dirname, '..', 'all_ai_interview-main', 'database_generate', 'update_personas_thai.py')
    
    if (!existsSync(scriptPath)) {
      return res.status(404).json({
        success: false,
        error: 'Script not found',
        message: `update_personas_thai.py not found at ${scriptPath}`
      })
    }

    // Run the Python script
    const { stdout, stderr } = await execAsync(`python "${scriptPath}"`, {
      cwd: join(__dirname, '..', 'all_ai_interview-main', 'database_generate'),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    })

    if (stderr && !stderr.includes('[OK]') && !stderr.includes('[SUCCESS]')) {
      console.error('Script stderr:', stderr)
    }

    res.json({
      success: true,
      message: 'Personas updated to Thai language successfully',
      output: stdout || stderr
    })
  } catch (error) {
    console.error('Error updating personas to Thai:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update personas',
      message: error.message
    })
  }
})

// Executive Summary (with AI using OpenAI from Settings)
app.get('/api/demo/insights/executive-summary', async (req, res) => {
  try {
    // Get analytics data first
    const analytics = await proxyToDemoAPI('/analytics/summary')
    const interviews = await proxyToDemoAPI('/interviews')
    
    // Use OpenAI to generate executive summary
    const apiKey = getApiKey('openai')
    if (!apiKey || apiKey === 'dummy-key') {
      return res.status(400).json({
        success: false,
        error: 'OpenAI API key not configured',
        message: 'Please configure OpenAI API key in AI Settings'
      })
    }

    const openaiClient = getOpenAI()
    const modelToUse = 'gpt-4o-mini' // Use gpt-4o-mini as requested
    
    // Prepare context
    const context = {
      total_interviews: analytics.total_interviews || 0,
      top_themes: analytics.top_themes?.slice(0, 5).map(t => t.theme_name_th) || [],
      brand_mentions: analytics.brand_mentions?.slice(0, 5).map(b => b.brand_name) || []
    }
    
    const prompt = `คุณเป็นนักวิเคราะห์ข้อมูลผู้เชี่ยวชาญ กรุณาสร้างบทสรุปผู้บริหาร (Executive Summary) จากข้อมูลการสัมภาษณ์ต่อไปนี้:

ข้อมูลพื้นฐาน:
- จำนวนการสัมภาษณ์: ${context.total_interviews}
- Themes ที่พบมากที่สุด: ${context.top_themes.join(', ')}
- Brands ที่ถูกกล่าวถึง: ${context.brand_mentions.join(', ')}

กรุณาสร้างบทสรุปผู้บริหารที่ครอบคลุม:
1. สรุปภาพรวม (Overview)
2. ข้อค้นพบสำคัญ (Key Findings) - 3-5 ข้อ
3. ข้อเสนอแนะ (Recommendations)

ใช้ภาษาไทยที่ชัดเจนและเป็นมืออาชีพ`

    const completion = await openaiClient.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: 'คุณเป็นนักวิเคราะห์ข้อมูลมืออาชีพ ตอบเป็นภาษาไทย'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const summary = completion.choices[0]?.message?.content || 'ไม่สามารถสร้างบทสรุปได้'

    res.json({
      success: true,
      summary: summary,
      data_context: context,
      key_findings: [
        {
          title: 'ข้อมูลจากการสัมภาษณ์',
          description: `พบ ${context.total_interviews} การสัมภาษณ์ โดยมี themes หลักคือ ${context.top_themes.slice(0, 3).join(', ')}`,
          opportunity: 'ควรวิเคราะห์ข้อมูลเพิ่มเติมเพื่อหาข้อเสนอแนะที่ชัดเจน'
        }
      ]
    })
  } catch (error) {
    console.error('Error generating executive summary:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate executive summary',
      message: error.message
    })
  }
})

// Health check endpoint (for Docker and nginx)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Static file serving middleware - MUST be after API routes
// Serve static files from dist folder at /aiinterview path
const DIST_DIR = join(__dirname, '..', 'dist')
const staticMiddleware = express.static(DIST_DIR, {
  index: false, // Don't serve index.html automatically for directory requests
  setHeaders: (res, filePath) => {
    // Ensure correct MIME types
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css')
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript')
    } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg')
    } else if (filePath.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png')
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml')
    } else if (filePath.endsWith('.ico')) {
      res.setHeader('Content-Type', 'image/x-icon')
    }
  }
})

// Handle favicon.ico requests at root level (browsers automatically request this)
app.get('/favicon.ico', (req, res) => {
  const faviconPath = join(DIST_DIR, 'vite.svg')
  if (existsSync(faviconPath)) {
    res.setHeader('Content-Type', 'image/svg+xml')
    res.sendFile(faviconPath)
  } else {
    // Return 204 No Content if favicon doesn't exist (prevents 404 errors in console)
    res.status(204).end()
  }
})

app.use('/aiinterview', staticMiddleware)

// Redirect root path to /aiinterview
app.get('/', (req, res) => {
  res.redirect('/aiinterview')
})

// Redirect old interview links to new path
app.get('/interview/:id', (req, res) => {
  res.redirect(`/aiinterview/interview/${req.params.id}`)
})

// Serve index.html for SPA routing under /aiinterview
// This middleware runs after static middleware, so it only handles requests that weren't served as static files
app.use('/aiinterview', (req, res, next) => {
  // Only handle GET requests
  if (req.method !== 'GET') {
    return next()
  }
  
  // Check if this is a static asset request
  const staticFileExtensions = ['.css', '.js', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map']
  const pathLower = req.path.toLowerCase()
  const hasExtension = staticFileExtensions.some(ext => pathLower.endsWith(ext))
  
  // If it's a static file extension, it should have been handled by static middleware
  // If we reach here, the file doesn't exist - return 404
  if (hasExtension) {
    return res.status(404).json({ error: 'File not found', path: req.path })
  }
  
  // For all other paths (including root /aiinterview), serve index.html for SPA routing
  const indexPath = join(DIST_DIR, 'index.html')
  if (existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    return res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error sending index.html:', err)
        res.status(500).send('Internal server error')
      }
    })
  } else {
    console.error(`❌ index.html not found at ${indexPath}`)
    console.error(`   DIST_DIR: ${DIST_DIR}`)
    console.error(`   Please ensure frontend is built and dist folder exists`)
    return res.status(404).json({
      error: 'Frontend not found',
      message: 'Frontend build (dist folder) is missing. Please build frontend and copy dist folder to backend.'
    })
  }
  next()
})

// Error handling middleware
app.use((err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled error:', err)
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' 
      : err.message
  })
})

// 404 handler for API routes only (frontend routes handled above)
app.use((req, res) => {
  // Skip if this is already handled by frontend routing
  if (req.path.startsWith('/aiinterview')) {
    return res.status(404).json({
      error: 'Not found',
      message: `Route ${req.method} ${req.path} not found`
    })
  }
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  })
})

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`)
  console.log(`📡 API endpoints available at http://${HOST}:${PORT}/api`)
})

