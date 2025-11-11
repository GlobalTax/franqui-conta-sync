// ============================================================================
// HTTP SIGNATURE - RFC 8941 hs2019 Signature for Ponto API
// Purpose: Sign outgoing requests to Ponto API using private key
// ============================================================================

// Helper to encode to base64
function base64Encode(input: Uint8Array): string {
  return btoa(String.fromCharCode(...input));
}

/**
 * Signs an HTTP request for Ponto API using hs2019 signature scheme
 * 
 * Mock mode: If private key not set, returns mock signature for development
 */
export async function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string
): Promise<Record<string, string>> {
  const keyId = Deno.env.get('PONTO_KEY_ID');
  const privateKeyPem = Deno.env.get('PONTO_PRIVATE_KEY_PEM');

  // Mock mode for development without secrets
  if (!keyId || !privateKeyPem) {
    console.warn('⚠️ HTTP-SIGNATURE MOCK MODE: Keys not set, using mock signature');
    return {
      ...headers,
      'Signature': 'keyId="mock",algorithm="hs2019",headers="(request-target) host date digest",signature="MOCK_SIGNATURE"',
      'Digest': 'SHA-512=MOCK_DIGEST',
    };
  }

  try {
    // 1. Calculate digest (if body present)
    let digest = '';
    if (body) {
      const bodyBytes = new TextEncoder().encode(body);
      const hashBuffer = await crypto.subtle.digest('SHA-512', bodyBytes);
      const hashBase64 = base64Encode(new Uint8Array(hashBuffer));
      digest = `SHA-512=${hashBase64}`;
      headers['Digest'] = digest;
    }

    // 2. Build signing string
    const host = headers['Host'] || 'api.ponto.com';
    const date = headers['Date'] || new Date().toUTCString();
    headers['Host'] = host;
    headers['Date'] = date;

    const signingString = buildSigningString(method, path, headers, digest);

    // 3. Sign with private key
    const privateKey = await importPrivateKey(privateKeyPem);
    const signatureBytes = await crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      privateKey,
      new TextEncoder().encode(signingString)
    );

    const signatureBase64 = base64Encode(new Uint8Array(signatureBytes));

    // 4. Build Signature header
    const headersUsed = digest 
      ? '(request-target) host date digest'
      : '(request-target) host date';

    headers['Signature'] = [
      `keyId="${keyId}"`,
      `algorithm="hs2019"`,
      `headers="${headersUsed}"`,
      `signature="${signatureBase64}"`
    ].join(',');

    return headers;
  } catch (error) {
    console.error('HTTP signature failed:', error);
    throw new Error('HTTP_SIGNATURE_FAILED');
  }
}

/**
 * Builds the signing string according to RFC 8941
 */
function buildSigningString(
  method: string,
  path: string,
  headers: Record<string, string>,
  digest: string
): string {
  const lines: string[] = [];

  // (request-target): method path
  lines.push(`(request-target): ${method.toLowerCase()} ${path}`);

  // host: api.ponto.com
  if (headers['Host']) {
    lines.push(`host: ${headers['Host']}`);
  }

  // date: Thu, 05 Jan 2024 21:31:40 GMT
  if (headers['Date']) {
    lines.push(`date: ${headers['Date']}`);
  }

  // digest: SHA-512=...
  if (digest) {
    lines.push(`digest: ${digest}`);
  }

  return lines.join('\n');
}

/**
 * Imports PEM-encoded RSA private key for signing
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  // Remove PEM headers/footers and whitespace
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  // Decode base64 to binary
  const binaryDer = atob(pemContents);
  const bytes = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    bytes[i] = binaryDer.charCodeAt(i);
  }

  // Import as PKCS#8
  return await crypto.subtle.importKey(
    'pkcs8',
    bytes,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
}
