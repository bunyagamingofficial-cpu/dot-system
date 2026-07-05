export type OfficerRank = 'commissioner' | 'inspector' | 'officer';
export type OfficerStatus = 'active' | 'suspended' | 'deleted';
export type ServiceStatus = 'paid' | 'unpaid';

export type Department =
  | 'civil_maintenance'
  | 'vehicle_rescue'
  | 'electrical'
  | 'traffic_management'
  | 'emergency_assistance';

export interface Officer {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  rank: OfficerRank;
  department: Department;
  status: OfficerStatus;
  is_on_duty: boolean;
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  created_by: string | null;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceRate {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceRecord {
  id: string;
  roblox_username: string;
  discord_username: string;
  service_rate_id: string | null;
  service_name: string;
  amount: number;
  status: ServiceStatus;
  officer_id: string | null;
  officer_name: string;
  notes: string;
  service_date: string;
  created_at: string;
  updated_at: string;
}

export interface DutyLog {
  id: string;
  officer_id: string | null;
  officer_name: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_by_name: string | null;
  delete_reason: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  performed_by: string | null;
  performed_by_name: string;
  details: Record<string, unknown>;
  created_at: string;
}

export const RANK_LABELS: Record<OfficerRank, string> = {
  commissioner: 'หัวหน้ากรมขนส่ง',
  inspector: 'ผู้คุมสอบกรมขนส่ง',
  officer: 'พนักงาน',
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  civil_maintenance: 'โยธาซ่อมบำรุง',
  vehicle_rescue: 'กู้ภัยรถยก',
  electrical: 'การไฟฟ้า',
  traffic_management: 'จัดการจราจร',
  emergency_assistance: 'ช่วยเหลือฉุกเฉิน',
};

export const DEPARTMENTS: Department[] = [
  'civil_maintenance',
  'vehicle_rescue',
  'electrical',
  'traffic_management',
  'emergency_assistance',
];
