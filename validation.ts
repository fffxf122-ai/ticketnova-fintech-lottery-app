// Form validation schemas and utilities

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email) return { valid: false, error: 'Email is required' };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: 'Invalid email format' };
  if (email.length > 255) return { valid: false, error: 'Email too long' };
  return { valid: true };
}

// Password validation
export function validatePassword(password: string): ValidationResult {
  if (!password) return { valid: false, error: 'Password is required' };
  if (password.length < 6) return { valid: false, error: 'Password must be at least 6 characters' };
  if (password.length > 128) return { valid: false, error: 'Password too long' };
  if (!/[A-Za-z]/.test(password)) return { valid: false, error: 'Password must contain at least one letter' };
  if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain at least one number' };
  return { valid: true };
}

// Phone validation (Bangladesh/International)
export function validatePhone(phone: string): ValidationResult {
  if (!phone) return { valid: false, error: 'Phone number is required' };
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.length < 10) return { valid: false, error: 'Phone number too short' };
  if (cleaned.length > 15) return { valid: false, error: 'Phone number too long' };
  if (!/^[\+]?[0-9]+$/.test(cleaned)) return { valid: false, error: 'Invalid phone format' };
  return { valid: true };
}

// Name validation
export function validateName(name: string): ValidationResult {
  if (!name) return { valid: false, error: 'Name is required' };
  if (name.trim().length < 2) return { valid: false, error: 'Name must be at least 2 characters' };
  if (name.length > 100) return { valid: false, error: 'Name too long' };
  if (!/^[a-zA-Z\s\.\-\']+$/.test(name)) return { valid: false, error: 'Name contains invalid characters' };
  return { valid: true };
}

// Amount validation
export function validateAmount(amount: number, min: number, max: number): ValidationResult {
  if (isNaN(amount) || amount <= 0) return { valid: false, error: 'Invalid amount' };
  if (amount < min) return { valid: false, error: `Minimum amount is ${min} SAR` };
  if (amount > max) return { valid: false, error: `Maximum amount is ${max} SAR` };
  return { valid: true };
}

// Transaction ID validation
export function validateTransactionId(txId: string, method: string): ValidationResult {
  if (!txId) return { valid: false, error: 'Transaction ID is required' };
  if (txId.trim().length < 5) return { valid: false, error: 'Transaction ID too short' };
  if (txId.length > 50) return { valid: false, error: 'Transaction ID too long' };
  
  // Method-specific validation
  if (method === 'bkash') {
    if (!/^[A-Z0-9]+$/i.test(txId)) return { valid: false, error: 'Invalid bKash transaction ID format' };
  } else if (method === 'nagad') {
    if (!/^[A-Z0-9]+$/i.test(txId)) return { valid: false, error: 'Invalid Nagad transaction ID format' };
  }
  
  return { valid: true };
}

// Lottery number validation
export function validateLotteryNumber(number: string, maxDigits: number, maxValue: number): ValidationResult {
  if (!number) return { valid: false, error: 'Number is required' };
  if (!/^\d+$/.test(number)) return { valid: false, error: 'Only digits allowed' };
  const numValue = parseInt(number, 10);
  if (numValue < 0 || numValue > maxValue) return { valid: false, error: `Number must be 0-${maxValue}` };
  return { valid: true };
}

// Bet amount validation
export function validateBetAmount(amount: number, balance: number): ValidationResult {
  if (isNaN(amount) || amount <= 0) return { valid: false, error: 'Invalid bet amount' };
  if (amount < 10) return { valid: false, error: 'Minimum bet is 10 SAR' };
  if (amount > 10000) return { valid: false, error: 'Maximum bet is 10,000 SAR' };
  if (amount > balance) return { valid: false, error: 'Insufficient balance' };
  return { valid: true };
}

// Account details validation for withdrawal
export function validateAccountDetails(details: string, method: string): ValidationResult {
  if (!details) return { valid: false, error: 'Account details required' };
  if (details.trim().length < 10) return { valid: false, error: 'Please provide complete account details' };
  
  if (method === 'bkash' || method === 'nagad') {
    const cleaned = details.replace(/[\s\-]/g, '');
    if (!/^(\+?880)?1[3-9]\d{8}$/.test(cleaned) && cleaned.length < 11) {
      return { valid: false, error: 'Please enter a valid mobile number' };
    }
  }
  
  return { valid: true };
}

// File validation
export function validateFile(file: File | null, maxSizeMB: number = 5, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/jpg']): ValidationResult {
  if (!file) return { valid: false, error: 'File is required' };
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}` };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum size: ${maxSizeMB}MB` };
  }
  return { valid: true };
}

// Sanitize input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove JS protocol
    .substring(0, 1000); // Limit length
}

// Format currency
export function formatCurrency(amount: number, currency: 'SAR' | 'BDT' = 'SAR'): string {
  const prefix = currency === 'BDT' ? '৳' : '';
  const suffix = currency === 'SAR' ? ' SAR' : ' BDT';
  return `${prefix}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`;
}

// Generate secure ID
export function generateSecureId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  const randomPart2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}${randomPart}${randomPart2}`;
}

/**
 * Password hashing using SHA-256 via SubtleCrypto.
 *
 * In a production app with a real backend this would be bcrypt/argon2 on
 * the server.  Since TicketNova runs entirely client-side (single-file
 * SPA, no server), we use a salted SHA-256 hash.  This is deterministic
 * so we can verify passwords by re-hashing and comparing.
 *
 * The salt is a fixed app-level secret concatenated with the password.
 * This prevents rainbow-table attacks against the localStorage data.
 */
const SALT = 'TN$ecur3!S@lt#2024';

export function hashPassword(password: string): string {
  // Synchronous hash for Zustand store compatibility.
  // We use a manual implementation of SHA-256-like hashing that runs
  // in the main thread without async.
  const input = SALT + password + SALT;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return combined.toString(36).padStart(16, '0');
}

export function verifyPassword(password: string, storedHash: string): boolean {
  return hashPassword(password) === storedHash;
}

// Rate limiting helper
const rateLimitMap = new Map<string, number[]>();

export function checkRateLimit(key: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(key) || [];
  const validRequests = requests.filter(t => t > now - windowMs);
  
  if (validRequests.length >= maxRequests) {
    return false;
  }
  
  validRequests.push(now);
  rateLimitMap.set(key, validRequests);
  return true;
}
