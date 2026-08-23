import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import {
  inspectExcelFileAction,
  parseExcelFileAction,
  suggestColumnMappingsAction,
  saveMappingTemplateAction,
  listMappingTemplatesAction,
  deleteMappingTemplateAction,
  resolveFieldValuesAction,
  saveValueMappingsAction,
  listValueMappingsAction,
  deleteValueMappingAction,
} from "./actions";

vi.mock("@/server/services/auth.service", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/server/services/column-mapping.service", () => ({
  suggestColumnMappings: vi.fn(),
  saveMappingTemplateService: vi.fn(),
  listMappingTemplatesService: vi.fn(),
  getMappingTemplateService: vi.fn(),
  deleteMappingTemplateService: vi.fn(),
}));

vi.mock("@/server/services/value-mapping.service", () => ({
  analyzeAndResolveFieldValues: vi.fn(),
  saveValueMappingsService: vi.fn(),
  listValueMappingsService: vi.fn(),
  deleteValueMappingService: vi.fn(),
}));

import { getSession } from "@/server/services/auth.service";
import * as columnMappingService from "@/server/services/column-mapping.service";
import * as valueMappingService from "@/server/services/value-mapping.service";

function createMockExcelFile(
  name = "test.xlsx",
  data: unknown[][] = [
    ["ID", "Name", "Email"],
    ["1", "Alice", "alice@example.com"],
  ]
): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("Excel Import Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inspectExcelFileAction", () => {
    it("returns unauthorized error if user is not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const formData = new FormData();
      formData.append("file", createMockExcelFile());

      const result = await inspectExcelFileAction(formData);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("Authentication required");
    });

    it("returns validation error if no file is provided", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "u1", email: "admin@college.edu", name: "Admin" },
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      const formData = new FormData();
      const result = await inspectExcelFileAction(formData);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain("No valid file provided");
    });

    it("successfully inspects workbook when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "u1", email: "admin@college.edu", name: "Admin" },
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      const formData = new FormData();
      formData.append("file", createMockExcelFile("roster.xlsx"));

      const result = await inspectExcelFileAction(formData);
      expect(result.success).toBe(true);
      expect(result.data?.totalSheets).toBe(1);
      expect(result.data?.sheetNames).toEqual(["Sheet1"]);
      expect(result.data?.sheets[0].rowCount).toBe(2);
      expect(result.data?.sheets[0].columnCount).toBe(3);
    });
  });

  describe("parseExcelFileAction", () => {
    it("returns unauthorized error if user is not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const formData = new FormData();
      formData.append("file", createMockExcelFile());

      const result = await parseExcelFileAction(formData);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("successfully parses spreadsheet and returns structured headers and rows", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "u1", email: "admin@college.edu", name: "Admin" },
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      const formData = new FormData();
      formData.append(
        "file",
        createMockExcelFile("dataset.xlsx", [
          ["ID Code", "Full Name", "Date Joined"],
          ["EMP01", "Jane Doe", "2024-01-10"],
          ["EMP02", "John Smith", "2024-02-15"],
        ])
      );

      const result = await parseExcelFileAction(formData);
      expect(result.success).toBe(true);
      expect(result.data?.totalRows).toBe(2);
      expect(result.data?.headers.map((h) => h.key)).toEqual([
        "id_code",
        "full_name",
        "date_joined",
      ]);
      expect(result.data?.rows[0]).toEqual({
        __rowNumber: 2,
        id_code: "EMP01",
        full_name: "Jane Doe",
        date_joined: "2024-01-10",
      });
    });
  });

  describe("Column Mapping Server Actions", () => {
    const mockUser = { id: "u1", email: "admin@college.edu", name: "Admin" };

    it("suggestColumnMappingsAction returns suggestions when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(columnMappingService.suggestColumnMappings).mockResolvedValue({
        suggestions: {
          "Admission Number": {
            sourceHeader: "Admission Number",
            suggestedKey: "registerNumber",
            confidence: "HIGH",
            matchReason: "ALIAS",
          },
        },
        canonicalFields: [],
        matchedTemplate: null,
        unmappedRequiredKeys: [],
      });

      const res = await suggestColumnMappingsAction(
        ["Admission Number"],
        "STUDENT"
      );
      expect(res.success).toBe(true);
      expect(res.data?.suggestions["Admission Number"].suggestedKey).toBe(
        "registerNumber"
      );
    });

    it("saveMappingTemplateAction calls service and returns saved template", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(
        columnMappingService.saveMappingTemplateService
      ).mockResolvedValue({
        id: "tmpl_1",
        name: "ERP Template",
        entityType: "STUDENT",
        mapping: { "Reg No": "registerNumber" },
        isDefault: true,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await saveMappingTemplateAction({
        name: "ERP Template",
        entityType: "STUDENT",
        mapping: { "Reg No": "registerNumber" },
        isDefault: true,
      });

      expect(res.success).toBe(true);
      expect(res.data?.name).toBe("ERP Template");
    });

    it("listMappingTemplatesAction lists templates for entity type", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(
        columnMappingService.listMappingTemplatesService
      ).mockResolvedValue([
        {
          id: "tmpl_1",
          name: "Template A",
          entityType: "STUDENT",
          mapping: {},
          isDefault: false,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await listMappingTemplatesAction("STUDENT");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    it("deleteMappingTemplateAction deletes template by ID", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(
        columnMappingService.deleteMappingTemplateService
      ).mockResolvedValue({ success: true, id: "tmpl_1" });

      const res = await deleteMappingTemplateAction("tmpl_1");
      expect(res.success).toBe(true);
      expect(res.data?.id).toBe("tmpl_1");
    });
  });

  describe("Value Mapping Actions (Spec §18)", () => {
    const mockUser = {
      id: "u1",
      name: "Admin",
      email: "admin@college.edu",
    };

    it("resolveFieldValuesAction analyzes and resolves field values", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(
        valueMappingService.analyzeAndResolveFieldValues
      ).mockResolvedValue({
        items: [
          {
            fieldKey: "department",
            fieldLabel: "Department",
            sourceValue: "CSE",
            occurrenceCount: 2,
            status: "RESOLVED_EXACT",
            resolvedTargetId: "dept_cse",
            resolvedTargetLabel: "Computer Science & Engineering",
            suggestedTargetId: "dept_cse",
            suggestedTargetLabel: "Computer Science & Engineering",
            confidence: 1.0,
            availableTargets: [],
          },
        ],
        totalUniqueValues: 1,
        resolvedCount: 1,
        requiresConfirmationCount: 0,
        unresolvedCount: 0,
        allResolved: true,
      });

      const res = await resolveFieldValuesAction(
        [{ department: "CSE" }],
        ["department"],
        "STUDENT"
      );

      expect(res.success).toBe(true);
      expect(res.data?.resolvedCount).toBe(1);
      expect(res.data?.items[0].status).toBe("RESOLVED_EXACT");
    });

    it("saveValueMappingsAction saves aliases", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(valueMappingService.saveValueMappingsService).mockResolvedValue(
        [
          {
            id: "vm_1",
            entityType: "STUDENT",
            fieldKey: "department",
            sourceValue: "CSE",
            targetId: "dept_cse",
            targetLabel: "Computer Science & Engineering",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      );

      const res = await saveValueMappingsAction([
        {
          entityType: "STUDENT",
          fieldKey: "department",
          sourceValue: "CSE",
          targetId: "dept_cse",
          targetLabel: "Computer Science & Engineering",
        },
      ]);

      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
      expect(res.data?.[0].id).toBe("vm_1");
    });

    it("listValueMappingsAction lists aliases", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(valueMappingService.listValueMappingsService).mockResolvedValue(
        [
          {
            id: "vm_1",
            entityType: "STUDENT",
            fieldKey: "department",
            sourceValue: "CSE",
            targetId: "dept_cse",
            targetLabel: "Computer Science & Engineering",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]
      );

      const res = await listValueMappingsAction("STUDENT", "department");
      expect(res.success).toBe(true);
      expect(res.data).toHaveLength(1);
    });

    it("deleteValueMappingAction deletes alias by ID", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: mockUser,
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      vi.mocked(
        valueMappingService.deleteValueMappingService
      ).mockResolvedValue({ success: true, id: "vm_1" });

      const res = await deleteValueMappingAction("vm_1");
      expect(res.success).toBe(true);
      expect(res.data?.id).toBe("vm_1");
    });
  });
});
