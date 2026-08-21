import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateCustomFieldsZodSchema,
  listCustomFieldDefinitionsService,
  createCustomFieldDefinitionService,
} from "./custom-field.service";
import * as repo from "@/server/repositories/custom-field.repository";
import * as rbacService from "@/server/services/rbac.service";
import {
  ForbiddenError,
  UnauthorizedError,
  BadRequestError,
} from "@/server/errors/app-error";

vi.mock("@/server/repositories/custom-field.repository", () => ({
  listCustomFieldDefinitions: vi.fn(),
  findCustomFieldDefinitionById: vi.fn(),
  findCustomFieldDefinitionByName: vi.fn(),
  createCustomFieldDefinition: vi.fn(),
  updateCustomFieldDefinition: vi.fn(),
  deleteCustomFieldDefinition: vi.fn(),
  reorderCustomFieldDefinitions: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

describe("Custom Field Engine", () => {
  const adminUser = {
    id: "user_admin",
    name: "Admin User",
    email: "admin@college.edu",
  };
  const regularUser = {
    id: "user_student",
    name: "Student User",
    email: "student@college.edu",
  };

  const mockAdminRole = {
    id: "r1",
    name: "College Admin",
    code: "college_admin",
    description: "Full admin",
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStudentRole = {
    id: "r2",
    name: "Student",
    code: "student",
    description: "Student role",
    isSystem: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Dynamic Zod Schema Generation", () => {
    const mockFieldDefinitions = [
      {
        id: "cf_1",
        entityType: "STUDENT",
        name: "parentPhone",
        label: "Parent Phone",
        type: "PHONE" as const,
        required: true,
        unique: false,
        visibility: "ALL" as const,
        order: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cf_2",
        entityType: "STUDENT",
        name: "cpa",
        label: "Cumulative GPA",
        type: "DECIMAL" as const,
        required: true,
        unique: false,
        validation: { min: 0, max: 10 },
        visibility: "ALL" as const,
        order: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cf_3",
        entityType: "STUDENT",
        name: "bloodGroup",
        label: "Blood Group",
        type: "DROPDOWN" as const,
        required: false,
        unique: false,
        options: ["A+", "B+", "O+", "AB+"],
        visibility: "ALL" as const,
        order: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cf_4",
        entityType: "STUDENT",
        name: "personalEmail",
        label: "Personal Email",
        type: "EMAIL" as const,
        required: false,
        unique: false,
        visibility: "ALL" as const,
        order: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cf_5",
        entityType: "STUDENT",
        name: "hostelResident",
        label: "Hostel Resident",
        type: "CHECKBOX" as const,
        required: false,
        unique: false,
        visibility: "ALL" as const,
        order: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cf_6",
        entityType: "STUDENT",
        name: "knownLanguages",
        label: "Known Languages",
        type: "MULTI_SELECT" as const,
        required: true,
        unique: false,
        options: ["English", "Hindi", "Spanish"],
        visibility: "ALL" as const,
        order: 6,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cf_7",
        entityType: "STUDENT",
        name: "portfolioUrl",
        label: "Portfolio URL",
        type: "URL" as const,
        required: false,
        unique: false,
        visibility: "ALL" as const,
        order: 7,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it("accepts valid custom field values according to field definitions", () => {
      const schema = generateCustomFieldsZodSchema(mockFieldDefinitions);

      const validPayload = {
        parentPhone: "+91 9876543210",
        cpa: 8.75,
        bloodGroup: "O+",
        personalEmail: "student.personal@example.com",
        hostelResident: true,
        knownLanguages: ["English", "Hindi"],
        portfolioUrl: "https://johndoe.dev",
      };

      const result = schema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload missing required fields", () => {
      const schema = generateCustomFieldsZodSchema(mockFieldDefinitions);

      const invalidPayload = {
        // Missing parentPhone and knownLanguages
        cpa: 8.5,
        bloodGroup: "A+",
      };

      const result = schema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const issuePaths = result.error.issues.map((i) => i.path[0]);
        expect(issuePaths).toContain("parentPhone");
        expect(issuePaths).toContain("knownLanguages");
      }
    });

    it("rejects decimal value outside defined min/max bounds", () => {
      const schema = generateCustomFieldsZodSchema(mockFieldDefinitions);

      const invalidPayload = {
        parentPhone: "+1 555-0199",
        cpa: 11.5, // Max is 10
        knownLanguages: ["English"],
      };

      const result = schema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("maximum value is 10");
      }
    });

    it("rejects dropdown selection not in allowed options list", () => {
      const schema = generateCustomFieldsZodSchema(mockFieldDefinitions);

      const invalidPayload = {
        parentPhone: "+1 555-0199",
        cpa: 7.5,
        bloodGroup: "X-Positive", // Not in ["A+", "B+", "O+", "AB+"]
        knownLanguages: ["English"],
      };

      const result = schema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Invalid option selected"
        );
      }
    });

    it("rejects invalid email and URL formats", () => {
      const schema = generateCustomFieldsZodSchema(mockFieldDefinitions);

      const invalidPayload = {
        parentPhone: "+1 555-0199",
        cpa: 7.5,
        personalEmail: "invalid-email-string",
        portfolioUrl: "not-a-valid-url",
        knownLanguages: ["Spanish"],
      };

      const result = schema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        expect(messages.some((m) => m.includes("Invalid email address"))).toBe(
          true
        );
        expect(messages.some((m) => m.includes("Invalid URL format"))).toBe(
          true
        );
      }
    });

    it("allows optional fields to be omitted or passed as null / empty string", () => {
      const schema = generateCustomFieldsZodSchema(mockFieldDefinitions);

      const payloadWithEmptyOptionals = {
        parentPhone: "+91 9123456789",
        cpa: 9.0,
        bloodGroup: "",
        personalEmail: null,
        portfolioUrl: "",
        knownLanguages: ["English"],
      };

      const result = schema.safeParse(payloadWithEmptyOptionals);
      expect(result.success).toBe(true);
    });
  });

  describe("Service Layer Authorization", () => {
    it("throws UnauthorizedError when user is null", async () => {
      await expect(
        listCustomFieldDefinitionsService(null, "STUDENT")
      ).rejects.toThrow(UnauthorizedError);
    });

    it("throws ForbiddenError when user lacks fields.manage permission", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockStudentRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

      await expect(
        listCustomFieldDefinitionsService(regularUser, "STUDENT")
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows College Admin to create custom field definition", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "fields.manage",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

      vi.mocked(repo.findCustomFieldDefinitionByName).mockResolvedValue(null);
      vi.mocked(repo.createCustomFieldDefinition).mockResolvedValue({
        id: "cf_new",
        entityType: "STUDENT",
        name: "guardianName",
        label: "Guardian Name",
        type: "TEXT" as const,
        required: true,
        unique: false,
        defaultValue: null,
        validation: null,
        visibility: "ALL" as const,
        order: 1,
        helpText: null,
        options: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createCustomFieldDefinitionService(adminUser, {
        entityType: "STUDENT",
        name: "guardianName",
        label: "Guardian Name",
        type: "TEXT",
        required: true,
        unique: false,
        visibility: "ALL",
        order: 0,
        isActive: true,
      });

      expect(result.id).toBe("cf_new");
      expect(repo.createCustomFieldDefinition).toHaveBeenCalled();
    });

    it("prevents creating duplicate field names for the same entity", async () => {
      vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
      vi.mocked(rbacService.getUserPermissions).mockResolvedValue([
        "fields.manage",
      ]);
      vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);

      vi.mocked(repo.findCustomFieldDefinitionByName).mockResolvedValue({
        id: "cf_existing",
        entityType: "STUDENT",
        name: "guardianName",
        label: "Guardian Name",
        type: "TEXT" as const,
        required: false,
        unique: false,
        defaultValue: null,
        validation: null,
        visibility: "ALL" as const,
        order: 1,
        helpText: null,
        options: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        createCustomFieldDefinitionService(adminUser, {
          entityType: "STUDENT",
          name: "guardianName",
          label: "Guardian Name",
          type: "TEXT",
          required: false,
          unique: false,
          visibility: "ALL",
          order: 0,
          isActive: true,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
