import crypto from 'crypto'

// Use a master key for encryption (in production, this should be stored securely)
// For simplicity, we'll use a default key, but in production this should be in a secure key management system
const DEFAULT_MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY || 'default-master-key-change-in-production-32chars!!'

/**
 * Encrypt text using AES-256-GCM
 */
export function encrypt(text, masterKey = DEFAULT_MASTER_KEY) {
  try {
    // Generate a random IV
    const iv = crypto.randomBytes(16)
    
    // Create cipher
    const key = crypto.scryptSync(masterKey, 'salt', 32)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    
    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Get auth tag
    const authTag = cipher.getAuthTag()
    
    // Return combined IV + authTag + encrypted data
    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      encrypted: encrypted
    }
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt text using AES-256-GCM
 */
export function decrypt(encryptedData, masterKey = DEFAULT_MASTER_KEY) {
  try {
    const { iv, authTag, encrypted } = encryptedData
    
    // Create decipher
    const key = crypto.scryptSync(masterKey, 'salt', 32)
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'))
    
    // Set auth tag
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Encrypt and serialize for storage
 */
export function encryptForStorage(text, masterKey = DEFAULT_MASTER_KEY) {
  const encrypted = encrypt(text, masterKey)
  return JSON.stringify(encrypted)
}

/**
 * Decrypt from storage format
 */
export function decryptFromStorage(encryptedString, masterKey = DEFAULT_MASTER_KEY) {
  try {
    const encrypted = JSON.parse(encryptedString)
    return decrypt(encrypted, masterKey)
  } catch (error) {
    console.error('Decryption from storage error:', error)
    throw new Error('Failed to decrypt from storage')
  }
}
