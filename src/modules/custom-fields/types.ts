export type CustomFieldType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "DECIMAL"
  | "EMAIL"
  | "PHONE"
  | "DATE"
  | "DATETIME"
  | "DROPDOWN"
  | "MULTI_SELECT"
  | "RADIO"
  | "CHECKBOX"
  | "FILE"
  | "IMAGE"
  | "URL"
  | "CURRENCY";

export type CustomFieldVisibility = "ALL" | "ADMIN_ONLY" | "READ_ONLY";

export interface CustomFieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string; // Regex pattern
}

export interface CustomFieldOptionObject {
  label: string;
  value: string;
}

export type CustomFieldOption = string | CustomFieldOptionObject;

export interface CustomFieldDefinitionDto {
  id: string;
  entityType: string;
  name: string;
  label: string;
  type: CustomFieldType;
  required: boolean;
  unique: boolean;
  defaultValue?: unknown;
  validation?: CustomFieldValidation | null;
  visibility: CustomFieldVisibility;
  order: number;
  helpText?: string | null;
  options?: CustomFieldOption[] | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export const ENTITY_TYPES = [
  { value: "STUDENT", label: "Student Profile" },
  { value: "FACULTY", label: "Faculty / Staff Profile" },
  { value: "COMPANY", label: "Recruiting Company" },
  { value: "PLACEMENT_DRIVE", label: "Placement Drive" },
] as const;

export const CUSTOM_FIELD_TYPES: {
  value: CustomFieldType;
  label: string;
  description: string;
}[] = [
  {
    value: "TEXT",
    label: "Single-line Text",
    description: "Short string inputs like parent name or passport ID",
  },
  {
    value: "TEXTAREA",
    label: "Multi-line Textarea",
    description: "Long text input for comments or bio",
  },
  {
    value: "NUMBER",
    label: "Integer Number",
    description: "Whole number count or rank",
  },
  {
    value: "DECIMAL",
    label: "Decimal / Float",
    description: "Percentage or floating numbers",
  },
  {
    value: "CURRENCY",
    label: "Currency Amount",
    description: "Monetary amount in INR/USD",
  },
  {
    value: "EMAIL",
    label: "Email Address",
    description: "Validated email string",
  },
  {
    value: "PHONE",
    label: "Phone Number",
    description: "Contact number string",
  },
  {
    value: "URL",
    label: "Web Link / URL",
    description: "Validated URL e.g. LinkedIn or Portfolio",
  },
  {
    value: "DATE",
    label: "Date Picker",
    description: "Date without time e.g. YYYY-MM-DD",
  },
  {
    value: "DATETIME",
    label: "Date & Time",
    description: "Timestamp date and time picker",
  },
  {
    value: "DROPDOWN",
    label: "Single Select Dropdown",
    description: "Select one option from a list",
  },
  {
    value: "MULTI_SELECT",
    label: "Multi-Select Choices",
    description: "Select multiple options from a list",
  },
  {
    value: "RADIO",
    label: "Radio Selection",
    description: "Choose one option using radio buttons",
  },
  {
    value: "CHECKBOX",
    label: "Checkbox / Toggle",
    description: "Boolean true/false toggle",
  },
  {
    value: "FILE",
    label: "File Attachment",
    description: "Document upload URL or key",
  },
  {
    value: "IMAGE",
    label: "Image Attachment",
    description: "Image upload URL or key",
  },
];
