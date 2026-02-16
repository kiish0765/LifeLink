export type UserRole = 'admin' | 'donor' | 'receiver' | 'hospital';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type RequestStatus = 'open' | 'matched' | 'in_progress' | 'fulfilled' | 'cancelled';

export const BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Blood group compatibility: which donor groups can donate to which receiver
export const BLOOD_GROUP_COMPATIBILITY: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['A-', 'O-'],
  'A+': ['A-', 'A+', 'O-', 'O+'],
  'B-': ['B-', 'O-'],
  'B+': ['B-', 'B+', 'O-', 'O+'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'AB+': ['A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'O-', 'O+'],
};

export function canDonateTo(donorGroup: BloodGroup, receiverGroup: BloodGroup): boolean {
  return BLOOD_GROUP_COMPATIBILITY[receiverGroup].includes(donorGroup);
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  donorId?: string;
  hospitalId?: string;
}
