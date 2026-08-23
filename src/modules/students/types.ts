import type { CustomFieldDefinition, Prisma } from "@prisma/client";

export interface StudentDto {
  id: string;
  registerNumber: string;
  name: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: Date | string | null;
  programId: string;
  departmentId: string | null;
  batchId: string;
  academicPeriodId: string;
  isActive: boolean;
  customFields: Prisma.JsonValue;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface StudentWithRelationsDto extends StudentDto {
  program: {
    id: string;
    name: string;
    code: string;
    shortName: string;
    type?: string;
    durationYears?: number;
  };
  department: {
    id: string;
    name: string;
    code: string;
    type?: string;
  } | null;
  batch: {
    id: string;
    name: string;
    code: string;
    academicYear: string;
    admissionYear: number;
    graduationYear: number;
    section: string | null;
  };
  academicPeriod: {
    id: string;
    name: string;
    code: string;
    pattern?: string;
    orderIndex?: number;
  };
}

export interface StudentFormOptionsData {
  programs: { id: string; name: string; code: string; shortName: string }[];
  departments: {
    id: string;
    name: string;
    code: string;
    programId?: string | null;
  }[];
  batches: {
    id: string;
    name: string;
    code: string;
    programId: string;
    departmentId?: string | null;
  }[];
  academicPeriods: {
    id: string;
    name: string;
    code: string;
    programId: string;
    departmentId?: string | null;
    orderIndex: number;
  }[];
}

export interface StudentFilterOptions {
  departmentId?: string | string[];
  programId?: string;
  batchId?: string;
  academicPeriodId?: string;
  isActive?: boolean;
  search?: string;
}

export interface StudentAuditLogItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userEmail: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date | string;
}

export type StudentCustomFieldDefinition = CustomFieldDefinition;
