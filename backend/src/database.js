import pg from 'pg'
const { Pool } = pg

// Database connection configuration
// Use DATABASE_URL environment variable or fallback to default based on environment
// For localhost: use port 5432 (PostgreSQL default)
// For production server: use port 5433 (as configured in docker-compose.yml)
const getDefaultDatabaseUrl = () => {
  // Check if we're in production (Docker) or development (localhost)
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Get database port from environment or use default
  const dbPort = process.env.DB_PORT || (isProduction ? '5433' : '5432')
  const dbHost = process.env.DB_HOST || 'localhost'
  const dbUser = process.env.DB_USER || 'postgres'
  const dbPassword = process.env.DB_PASSWORD || 'postgres123'
  const dbName = process.env.DB_NAME || 'interview_db'
  
  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`
}

// Get connection string with detailed logging
const envDatabaseUrl = process.env.DATABASE_URL
const defaultUrl = getDefaultDatabaseUrl()
const connectionString = envDatabaseUrl || defaultUrl

// Log detailed connection info for debugging
const connectionInfo = connectionString.replace(/:[^:@]+@/, ':****@')
console.log(`📊 Database connection configuration:`)
console.log(`   DATABASE_URL env: ${envDatabaseUrl ? envDatabaseUrl.replace(/:[^:@]+@/, ':****@') : 'not set'}`)
console.log(`   Default URL: ${defaultUrl.replace(/:[^:@]+@/, ':****@')}`)
console.log(`   Using: ${connectionInfo}`)

// Extract and log port for verification
const portMatch = connectionString.match(/@[^:]+:(\d+)\//)
if (portMatch) {
  const port = portMatch[1]
  console.log(`   Port: ${port}`)
  if (port !== '5433' && port !== '5432') {
    console.warn(`   ⚠️  Warning: Unexpected port ${port}. Expected 5433 (production) or 5432 (development)`)
  }
}

// Validate connection string format
if (!connectionString.match(/^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^\/]+$/)) {
  console.error('❌ Invalid DATABASE_URL format. Expected: postgresql://user:password@host:port/database')
  console.error(`   Got: ${connectionInfo}`)
}

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err)
  process.exit(-1)
})

// Helper function to create database if it doesn't exist
const createDatabaseIfNotExists = async () => {
  // Get database name from connection string or environment
  const dbName = process.env.DB_NAME || 'interview_db'
  
  // Parse connection string to get components
  // Format: postgresql://user:password@host:port/database
  const urlMatch = connectionString.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/)
  
  if (!urlMatch) {
    // If can't parse, skip auto-create
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️  Could not parse DATABASE_URL, skipping auto-create')
      console.warn(`   Connection string: ${connectionString.replace(/:[^:@]+@/, ':****@')}`)
    }
    return
  }
  
  const [, user, password, host, port, currentDb] = urlMatch
  
  // Connect to default 'postgres' database to create the target database
  const defaultConnectionString = `postgresql://${user}:${password}@${host}:${port}/postgres`
  let adminPool = null
  
  try {
    adminPool = new Pool({
      connectionString: defaultConnectionString,
      max: 1,
      connectionTimeoutMillis: 2000,
    })
    
    // Check if database exists
    const result = await adminPool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    )
    
    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      // Escape database name to prevent SQL injection (though dbName should be safe)
      await adminPool.query(`CREATE DATABASE "${dbName}"`)
      console.log(`✅ Created database "${dbName}" automatically`)
    }
  } catch (error) {
    // If we can't create database (permissions, etc.), just log and continue
    // The main connection will fail and show appropriate error
    if (error.code !== '3D000' && error.code !== '28P01') {
      console.warn(`⚠️  Could not auto-create database (might already exist or connection issue): ${error.message}`)
    }
  } finally {
    if (adminPool) {
      try {
        await adminPool.end()
      } catch (err) {
        // Ignore errors when closing pool
      }
    }
  }
}

// Initialize database schema
export const initializeDatabase = async () => {
  try {
    // First, try to create database if it doesn't exist
    try {
      await createDatabaseIfNotExists()
    } catch (error) {
      // If auto-create fails, continue - main connection will show proper error
      console.warn('⚠️  Could not auto-create database, will try to connect anyway')
      console.warn(`   Error: ${error.message}`)
    }
    
    // Test connection first
    await pool.query('SELECT 1')
    console.log('✅ Connected to PostgreSQL database')

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT,
        body TEXT,
        survey_name VARCHAR(255),
        target TEXT,
        objective TEXT,
        desired_insights TEXT,
        key_questions TEXT,
        hypothesis TEXT,
        question_count INTEGER,
        demographic_question_count INTEGER,
        ai_model VARCHAR(100),
        target_audience JSONB,
        screening_questions JSONB,
        interview_guide JSONB,
        approved BOOLEAN DEFAULT false,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_results (
        id SERIAL PRIMARY KEY,
        card_id VARCHAR(255) REFERENCES cards(id) ON DELETE CASCADE,
        segment TEXT,
        key_focus TEXT,
        topic TEXT,
        persona JSONB,
        transcript JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_prompt_settings (
        id SERIAL PRIMARY KEY,
        demographic_prompt TEXT,
        interview_prompt TEXT,
        insight_prompt TEXT,
        chat_ai_prompt TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_config_settings (
        id SERIAL PRIMARY KEY,
        micro_ai_version VARCHAR(50) DEFAULT 'v1',
        rule_confidence_base NUMERIC(5,2) DEFAULT 0.45,
        llm_confidence_boost NUMERIC(5,2) DEFAULT 0.25,
        theme_similarity_threshold NUMERIC(5,2) DEFAULT 0.78,
        min_support_sessions INTEGER DEFAULT 3,
        credibility_weight_support NUMERIC(5,2) DEFAULT 0.6,
        credibility_weight_confidence NUMERIC(5,2) DEFAULT 0.2,
        credibility_weight_saturation NUMERIC(5,2) DEFAULT 0.2,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS interview_sessions (
        id SERIAL PRIMARY KEY,
        card_id VARCHAR(255) REFERENCES cards(id) ON DELETE CASCADE,
        messages JSONB,
        demographic_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cards_survey_name ON cards(survey_name)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_results_card_id ON interview_results(card_id)
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_interview_sessions_card_id ON interview_sessions(card_id)
    `)

    console.log('✅ Database schema initialized successfully')
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    throw error
  }
}

export default pool

