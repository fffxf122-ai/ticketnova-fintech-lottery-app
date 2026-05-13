// Audit Log System for tracking all critical actions

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export type AuditAction = 
  | 'login' | 'logout' | 'login_failed'
  | 'deposit_created' | 'deposit_approved' | 'deposit_rejected'
  | 'withdrawal_created' | 'withdrawal_approved' | 'withdrawal_rejected'
  | 'bet_placed' | 'bet_won' | 'bet_lost'
  | 'result_set'
  | 'kyc_submitted' | 'kyc_approved' | 'kyc_rejected'
  | 'user_banned' | 'user_unbanned'
  | 'balance_updated'
  | 'password_changed'
  | 'profile_updated';

export type ResourceType = 
  | 'user' | 'deposit' | 'withdrawal' | 'bet' | 'draw' | 'kyc' | 'session';

// In-memory audit log storage (in production, this would be a database)
let auditLogs: AuditLogEntry[] = [];

export function createAuditLog(
  userId: string,
  userName: string,
  action: AuditAction,
  resourceType: ResourceType,
  resourceId: string,
  details: Record<string, unknown> = {},
  severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    resourceType,
    resourceId,
    details,
    severity,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };
  
  auditLogs.unshift(entry);
  
  // Keep only last 1000 entries in memory
  if (auditLogs.length > 1000) {
    auditLogs = auditLogs.slice(0, 1000);
  }
  
  // Log critical actions to console in development
  if (severity === 'critical' || severity === 'high') {
    console.warn('[AUDIT]', action, resourceType, resourceId, details);
  }
  
  return entry;
}

export function getAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  resourceType?: ResourceType;
  severity?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): AuditLogEntry[] {
  let filtered = [...auditLogs];
  
  if (filters?.userId) {
    filtered = filtered.filter(l => l.userId === filters.userId);
  }
  if (filters?.action) {
    filtered = filtered.filter(l => l.action === filters.action);
  }
  if (filters?.resourceType) {
    filtered = filtered.filter(l => l.resourceType === filters.resourceType);
  }
  if (filters?.severity) {
    filtered = filtered.filter(l => l.severity === filters.severity);
  }
  if (filters?.startDate) {
    filtered = filtered.filter(l => new Date(l.timestamp) >= new Date(filters.startDate!));
  }
  if (filters?.endDate) {
    filtered = filtered.filter(l => new Date(l.timestamp) <= new Date(filters.endDate!));
  }
  
  return filtered.slice(0, filters?.limit || 100);
}

export function exportAuditLogs(logs: AuditLogEntry[]): string {
  const headers = 'Timestamp,User,Action,Resource Type,Resource ID,Severity,Details\n';
  const rows = logs.map(l => 
    `${l.timestamp},"${l.userName}",${l.action},${l.resourceType},${l.resourceId},${l.severity},"${JSON.stringify(l.details).replace(/"/g, '""')}"`
  ).join('\n');
  return headers + rows;
}

// Fraud detection patterns
export interface FraudAlert {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  alertType: FraudAlertType;
  severity: 'warning' | 'critical';
  description: string;
  resolved: boolean;
}

export type FraudAlertType = 
  | 'rapid_deposits'
  | 'unusual_betting_pattern'
  | 'multiple_failed_logins'
  | 'suspicious_withdrawal'
  | 'duplicate_transaction'
  | 'velocity_limit_exceeded';

let fraudAlerts: FraudAlert[] = [];

export function createFraudAlert(
  userId: string,
  userName: string,
  alertType: FraudAlertType,
  description: string,
  severity: 'warning' | 'critical' = 'warning'
): FraudAlert {
  const alert: FraudAlert = {
    id: `fraud-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    userId,
    userName,
    alertType,
    severity,
    description,
    resolved: false,
  };
  
  fraudAlerts.unshift(alert);
  
  return alert;
}

export function getFraudAlerts(onlyUnresolved = true): FraudAlert[] {
  return onlyUnresolved 
    ? fraudAlerts.filter(a => !a.resolved)
    : fraudAlerts;
}

export function resolveFraudAlert(alertId: string): void {
  const alert = fraudAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.resolved = true;
  }
}

// Velocity checks for fraud detection
const velocityMap = new Map<string, number[]>();

export function checkVelocity(
  key: string, 
  maxCount: number, 
  windowMs: number
): { allowed: boolean; count: number } {
  const now = Date.now();
  const times = velocityMap.get(key) || [];
  const validTimes = times.filter(t => t > now - windowMs);
  
  if (validTimes.length >= maxCount) {
    return { allowed: false, count: validTimes.length };
  }
  
  validTimes.push(now);
  velocityMap.set(key, validTimes);
  
  return { allowed: true, count: validTimes.length };
}

// Check for suspicious betting patterns
export function checkSuspiciousBetting(
  userId: string,
  amount: number,
  recentBets: { amount: number; createdAt: string }[]
): boolean {
  // Check for rapid high-value bets
  const last5Minutes = recentBets.filter(
    b => new Date(b.createdAt).getTime() > Date.now() - 300000
  );
  
  if (last5Minutes.length > 10) {
    return true; // Too many bets in 5 minutes
  }
  
  const totalLast5Min = last5Minutes.reduce((a, b) => a + b.amount, 0);
  if (totalLast5Min > 5000) {
    return true; // Too much wagered in 5 minutes
  }
  
  // Check for unusual amounts (exactly round numbers repeatedly)
  const roundBets = last5Minutes.filter(b => b.amount % 100 === 0);
  if (roundBets.length === last5Minutes.length && last5Minutes.length > 3) {
    return true; // Potentially automated betting
  }
  
  return false;
}
