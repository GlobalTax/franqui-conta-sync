// ============================================================================
// CRYPTO HELPERS - AES-256-GCM Encryption/Decryption
// Purpose: Secure token storage with mock mode for development
// ============================================================================

/**
 * Encrypts data using AES-256-GCM
 * Returns base64-encoded format: iv:authTag:ciphertext
 * 
 * Mock mode: If DATA_ENC_KEY not set, returns prefixed plaintext
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = Deno.env.get('DATA_ENC_KEY');
  
  // Mock mode for development without secrets
  if (!key) {
    console.warn('⚠️ CRYPTO MOCK MODE: DATA_ENC_KEY not set, using plaintext with prefix');
    return `MOCK:${btoa(plaintext)}`;
  }

  try {
    // Convert hex key to bytes
    const keyData = hexToBytes(key);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      cryptoKey,
      encoded
    );

    // Extract auth tag (last 16 bytes)
    const ciphertextArray = new Uint8Array(ciphertext);
    const authTag = ciphertextArray.slice(-16);
    const actualCiphertext = ciphertextArray.slice(0, -16);

    // Format: iv:authTag:ciphertext (all base64)
    return [
      bytesToBase64(iv),
      bytesToBase64(authTag),
      bytesToBase64(actualCiphertext)
    ].join(':');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('CRYPTO_ENCRYPT_FAILED');
  }
}

/**
 * Decrypts data encrypted with encrypt()
 * 
 * Mock mode: Detects MOCK: prefix and returns decoded plaintext
 */
export async function decrypt(encrypted: string): Promise<string> {
  // Handle mock mode
  if (encrypted.startsWith('MOCK:')) {
    console.warn('⚠️ CRYPTO MOCK MODE: Decrypting mock data');
    return atob(encrypted.slice(5));
  }

  const key = Deno.env.get('DATA_ENC_KEY');
  if (!key) {
    throw new Error('CRYPTO_KEY_NOT_SET');
  }

  try {
    // Parse format: iv:authTag:ciphertext
    const [ivB64, authTagB64, ciphertextB64] = encrypted.split(':');
    if (!ivB64 || !authTagB64 || !ciphertextB64) {
      throw new Error('CRYPTO_INVALID_FORMAT');
    }

    const iv = base64ToBytes(ivB64);
    const authTag = base64ToBytes(authTagB64);
    const ciphertext = base64ToBytes(ciphertextB64);

    // Reconstruct full ciphertext with auth tag
    const fullCiphertext = new Uint8Array(ciphertext.length + authTag.length);
    fullCiphertext.set(ciphertext);
    fullCiphertext.set(authTag, ciphertext.length);

    // Import key
    const keyData = hexToBytes(key);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData.buffer as ArrayBuffer,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer, tagLength: 128 },
      cryptoKey,
      fullCiphertext.buffer as ArrayBuffer
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('CRYPTO_DECRYPT_FAILED');
  }
}

/**
 * Generates a secure fingerprint of data for logging (non-reversible)
 */
export async function fingerprint(data: string): Promise<string> {
  const encoded = new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(hash)).slice(0, 16);
}

// ============================================================================
// Utility Functions
// ============================================================================

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
