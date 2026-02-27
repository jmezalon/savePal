// Enums
export enum Frequency {
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum PayoutMethod {
  SEQUENTIAL = 'SEQUENTIAL',
  RANDOM = 'RANDOM',
  BIDDING = 'BIDDING',
}

export enum GroupStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

// User Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  totalSaved: number;
  activeGroups: number;
  completedGroups: number;
  trustScore: number;
}

// Group Types
export interface Group {
  id: string;
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: Frequency;
  payoutFrequency?: Frequency;
  payoutMethod: PayoutMethod;
  status: GroupStatus;
  maxMembers: number;
  currentMembers: number;
  startDate?: Date;
  endDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Membership Types
export interface Membership {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  payoutPosition: number;
  joinedAt: Date;
  isActive: boolean;
}

// Cycle Types
export interface Cycle {
  id: string;
  groupId: string;
  cycleNumber: number;
  recipientId: string;
  dueDate: Date;
  completedDate?: Date;
  totalAmount: number;
  isCompleted: boolean;
}

// Payment Types
export interface Payment {
  id: string;
  cycleId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  contributionPeriod: number;
  dueDate?: Date;
  stripePaymentIntentId?: string;
  paidAt?: Date;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse extends ApiResponse {
  data: {
    user: User;
    tokens: AuthTokens;
  };
}

// Group Creation
export interface CreateGroupData {
  name: string;
  description?: string;
  contributionAmount: number;
  frequency: Frequency;
  payoutFrequency?: Frequency;
  payoutMethod: PayoutMethod;
  maxMembers: number;
  startDate?: string;
}

// Helper: fixed multiplier for contributions per payout period
export function getContributionsPerPayout(contributionFreq: Frequency, payoutFreq: Frequency): number {
  const map: Record<string, Record<string, number>> = {
    [Frequency.WEEKLY]:   { [Frequency.WEEKLY]: 1, [Frequency.BIWEEKLY]: 2, [Frequency.MONTHLY]: 4 },
    [Frequency.BIWEEKLY]: { [Frequency.BIWEEKLY]: 1, [Frequency.MONTHLY]: 2 },
    [Frequency.MONTHLY]:  { [Frequency.MONTHLY]: 1 },
  };
  const result = map[contributionFreq]?.[payoutFreq];
  if (result === undefined) {
    throw new Error(`Invalid frequency combination: contribution=${contributionFreq}, payout=${payoutFreq}`);
  }
  return result;
}
