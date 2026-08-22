import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getFormDefinitionByCodeService,
  deleteFormFieldService,
  generateDynamicZodSchema,
} from "./dynamic-form.service";
import * as repo from "@/server/repositories/dynamic-form.repository";
import { BadRequestError } from "@/server/errors/app-error";
import { FormFieldDto } from "@/modules/dynamic-forms/types";

vi.mock("@/server/authorization", () => ({
  authorize: vi.fn().mockResolvedValue({ authorized: true }),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/repositories/dynamic-form.repository");

describe("dynamic-form.service", () => {
  const mockAdminUser = {
    id: "admin-1",
    email: "admin@college.edu",
    name: "Admin",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFormDefinitionByCodeService", () => {
    it("returns form definition if found", async () => {
      const mockForm = {
        id: "form-1",
        code: "TC_REQUEST_FORM",
        name: "TC Request Form",
        entityType: "TC_REQUEST",
        description: null,
        isActive: true,
        fields: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(repo.findFormDefinitionByCode).mockResolvedValue(
        mockForm as unknown as Awaited<
          ReturnType<typeof repo.findFormDefinitionByCode>
        >
      );

      const result = await getFormDefinitionByCodeService(
        mockAdminUser,
        "TC_REQUEST_FORM"
      );
      expect(result.code).toBe("TC_REQUEST_FORM");
    });
  });

  describe("deleteFormFieldService", () => {
    it("throws BadRequestError if trying to delete a core field", async () => {
      const mockCoreField = {
        id: "field-core-1",
        formDefinitionId: "form-1",
        fieldKey: "reasonForTc",
        label: "Reason for TC",
        type: "TEXTAREA",
        isCore: true,
        required: true,
        order: 0,
      };

      vi.mocked(repo.findFormFieldById).mockResolvedValue(
        mockCoreField as unknown as Awaited<
          ReturnType<typeof repo.findFormFieldById>
        >
      );

      await expect(
        deleteFormFieldService(mockAdminUser, "field-core-1")
      ).rejects.toThrow(BadRequestError);

      await expect(
        deleteFormFieldService(mockAdminUser, "field-core-1")
      ).rejects.toThrow(/Core relational\/system field .* cannot be removed/);
    });

    it("successfully deletes custom non-core field", async () => {
      const mockCustomField = {
        id: "field-custom-1",
        formDefinitionId: "form-1",
        fieldKey: "customRemarks",
        label: "Custom Remarks",
        type: "TEXT",
        isCore: false,
        required: false,
        order: 1,
      };

      vi.mocked(repo.findFormFieldById).mockResolvedValue(
        mockCustomField as unknown as Awaited<
          ReturnType<typeof repo.findFormFieldById>
        >
      );
      vi.mocked(repo.deleteFormField).mockResolvedValue(
        mockCustomField as unknown as Awaited<
          ReturnType<typeof repo.deleteFormField>
        >
      );

      const result = await deleteFormFieldService(
        mockAdminUser,
        "field-custom-1"
      );
      expect(result.id).toBe("field-custom-1");
      expect(repo.deleteFormField).toHaveBeenCalledWith("field-custom-1");
    });
  });

  describe("generateDynamicZodSchema", () => {
    it("generates a working Zod schema validating required and optional fields", () => {
      const fields: FormFieldDto[] = [
        {
          id: "f1",
          formDefinitionId: "form-1",
          fieldKey: "reasonForTc",
          label: "Reason for TC",
          type: "TEXT",
          isCore: true,
          required: true,
          order: 0,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "f2",
          formDefinitionId: "form-1",
          fieldKey: "conductRemarks",
          label: "Conduct Remarks",
          type: "TEXT",
          isCore: false,
          required: false,
          order: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const schema = generateDynamicZodSchema(fields);

      // Failing validation when required field is empty
      const invalidResult = schema.safeParse({ reasonForTc: "" });
      expect(invalidResult.success).toBe(false);

      // Passing validation when required field is provided
      const validResult = schema.safeParse({
        reasonForTc: "Moving to another city",
        conductRemarks: "Good",
      });
      expect(validResult.success).toBe(true);
    });
  });
});
