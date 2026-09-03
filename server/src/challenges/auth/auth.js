/**
 * PROJECT NIMBUS - AUTH & SESSION GATEWAY
 * Service: Nimbus Identity & Access Management (IAM)
 * 
 * Incident Ticket #NIM-4091:
 * "Production auth service is failing critical compliance checks.
 * Multiple auth flows returning unexpected responses and guest sessions are crashing."
 */

export const TOKEN_EXPIRY_MS = 3600 * 1000; // 1 hour

/**
 * Validates whether a token payload is still valid and not expired.
 * BUG 1: Off-by-one boundary check. Token at exact expiry timestamp is incorrectly marked valid.
 */
export function isTokenValid(token, currentTimestamp = Date.now()) {
  if (!token || typeof token !== 'object') {
    return false;
  }
  if (!token.issuedAt || !token.expiresAt) {
    return false;
  }
  // BUG: Using > instead of >= means token is accepted after expiration boundary has passed
  if (currentTimestamp > token.expiresAt) {
    return false;
  }
  return true;
}

/**
 * Authenticates user credentials and generates response.
 * BUG 2: Returns status 400 instead of 401 for bad credentials.
 */
export function authenticateUser(userRepo, username, password) {
  if (!username || !password) {
    return {
      status: 400,
      error: 'Missing credentials',
      session: null
    };
  }

  const user = userRepo.find(u => u.username === username);
  if (!user) {
    // BUG: Standard OAuth/REST spec requires 401 Unauthorized for invalid credentials, not 400
    return {
      status: 400,
      error: 'Invalid username or password',
      session: null
    };
  }

  // Simplified hash check for demonstration
  const isValidPassword = (user.passwordHash === `hashed_${password}`);
  if (!isValidPassword) {
    // BUG: Also returning 400 instead of 401
    return {
      status: 400,
      error: 'Invalid username or password',
      session: null
    };
  }

  const now = Date.now();
  return {
    status: 200,
    session: {
      userId: user.id,
      username: user.username,
      role: user.role,
      issuedAt: now,
      expiresAt: now + TOKEN_EXPIRY_MS
    }
  };
}

/**
 * Checks if a user has a specific permission.
 * BUG 3: Unhandled null/undefined permissions array for Guest accounts.
 */
export function checkPermission(user, requiredPermission) {
  if (!user) {
    return false;
  }

  // Superadmin always has access
  if (user.role === 'admin' || user.role === 'root') {
    return true;
  }

  // BUG: If user is guest, user.permissions is null/undefined, throwing TypeError
  // FIX NEEDED: user.permissions && user.permissions.includes(requiredPermission)
  return user.permissions.includes(requiredPermission);
}

/**
 * Computes a session HMAC signature token.
 * BUG 4: Substring slice off-by-one truncates the signature by 1 char.
 */
export function generateSessionSignature(sessionId, secretKey) {
  if (!sessionId || !secretKey) {
    throw new Error('Invalid signature arguments');
  }

  let hash = 0;
  const combined = `${sessionId}::${secretKey}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }

  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  // BUG: Truncating the final character with slice(0, 7) instead of using full 8-char signature
  return `SIG_${hexHash.slice(0, 7)}`;
}

/**
 * Verifies if a given session signature matches the expected signature.
 */
export function verifySessionSignature(sessionId, signature, secretKey) {
  const expected = generateSessionSignature(sessionId, secretKey);
  return signature === expected;
}
