export type FormFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DECIMAL"
  | "EMAIL"
  | "PHONE"
  | "DATE"
  | "DATETIME"
  | "DROPDOWN"
  | "RADIO"
  | "CHECKBOX"
  | "MULTI_SELECT"
  | "FILE"
  | "IMAGE"
  | "URL"
  | "CURRENCY"
  | "PROGRAM_SELECT"
  | "DEPARTMENT_SELECT"
  | "BATCH_SELECT"
  | "ACADEMIC_PERIOD_SELECT"
  | "STUDENT_SELECT"
  | "DRIVE_SELECT";

export interface FormFieldDto {
  id: string;
  formDefinitionId: string;
  fieldKey: string;
  label: string;
  type: string;
  isCore: boolean;
  customFieldId?: string | null;
  required: boolean;
  order: number;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown;
  validation?: unknown;
  defaultValue?: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FormDefinitionDto {
  id: string;
  code: string;
  name: string;
  entityType: string;
  description?: string | null;
  isActive: boolean;
  fields: FormFieldDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFormFieldInput {
  fieldKey: string;
  label: string;
  type: string;
  isCore?: boolean;
  customFieldId?: string | null;
  required?: boolean;
  order?: number;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown;
  validation?: unknown;
  defaultValue?: unknown;
  isActive?: boolean;
}

export interface UpdateFormFieldInput {
  label?: string;
  type?: string;
  required?: boolean;
  order?: number;
  placeholder?: string | null;
  helpText?: string | null;
  options?: unknown;
  validation?: unknown;
  defaultValue?: unknown;
  isActive?: boolean;
}

export interface CreateFormDefinitionInput {
  code: string;
  name: string;
  entityType: string;
  description?: string | null;
  isActive?: boolean;
  fields?: CreateFormFieldInput[];
}

export interface UpdateFormDefinitionInput {
  name?: string;
  entityType?: string;
  description?: string | null;
  isActive?: boolean;
}
