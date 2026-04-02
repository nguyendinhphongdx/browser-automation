import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const KEY_FILE = 'encryption.key'

let encryptionKey: Buffer | null = null

function getKeyPath(): string {
  return path.join(app.getPath('userData'), KEY_FILE)
}

function loadOrCreateKey(): Buffer {
  if (encryptionKey) return encryptionKey

  const keyPath = getKeyPath()

  if (fs.existsSync(keyPath)) {
    encryptionKey = Buffer.from(fs.readFileSync(keyPath, 'utf-8'), 'hex')
  } else {
    encryptionKey = crypto.randomBytes(KEY_LENGTH)
    fs.writeFileSync(keyPath, encryptionKey.toString('hex'), { mode: 0o600 })
  }

  return encryptionKey
}

export function encrypt(plaintext: string): string {
  if (!plaintext) return plaintext

  const key = loadOrCreateKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decrypt(encrypted: string): string {
  if (!encrypted || !encrypted.includes(':')) return encrypted

  const parts = encrypted.split(':')
  if (parts.length !== 3) return encrypted

  try {
    const key = loadOrCreateKey()
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const ciphertext = parts[2]

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    // If decryption fails, return as-is (likely plaintext from before encryption was added)
    return encrypted
  }
}
