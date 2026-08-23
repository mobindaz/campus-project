import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCanonicalFields,
  matchSingleHeader,
  suggestColumnMappings,
  applyColumnMapping,
  saveMappingTemplateService,
  listMappingTemplatesService,
  getMappingTemplateService,
  deleteMappingTemplateService,
} from "./column-mapping.service";
import type { CanonicalField } from "@/modules/excel-import/types";

// Mock repository and custom-field repository
vi.mock("@/server/repositories/import-mapping.repository", () => ({
  listImportMappings: vi.fn(),
  findImportMappingById: vi.fn(),
  findImportMappingByName: vi.fn(),
  findDefaultImportMapping: vi.fn(),
  clearDefaultImportMappings: vi.fn(),
  createImportMapping: vi.fn(),
  updateImportMapping: vi.fn(),
  deleteImportMapping: vi.fn(),
}));

vi.mock("@/server/repositories/custom-field.repository", () => ({
  listCustomFieldDefinitions: vi.fn(),
}));

vi.mock("@/server/authorization", () => ({
  authorize: vi.fn().mockResolvedValue({ authorized: true }),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(undefined),
}));

import * as repo from "@/server/repositories/import-mapping.repository";
import * as customFieldRepo from "@/server/repositories/custom-field.repository";

describe("Column Mapping Engine Service (Spec §14–15)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(customFieldRepo.listCustomFieldDefinitions).mockResolvedValue([]);
    vi.mocked(repo.listImportMappings).mockResolvedValue([]);
  });

  describe("Canonical Field Registry", () => {
    it("returns core fields for STUDENT entity type", async () => {
      const fields = await getCanonicalFields("STUDENT");
      const keys = fields.map((f) => f.key);

      expect(keys).toContain("registerNumber");
      expect(keys).toContain("name");
      expect(keys).toContain("dateOfBirth");
      expect(keys).toContain("department");
      expect(keys).toContain("program");
      expect(keys).toContain("batch");
      expect(keys).toContain("academicPeriod");
      expect(keys).toContain("phone");
      expect(keys).toContain("email");
    });

    it("integrates active custom fields into canonical registry", async () => {
      vi.mocked(customFieldRepo.listCustomFieldDefinitions).mockResolvedValue([
        {
          id: "cf_1",
          entityType: "STUDENT",
          name: "parentPhone",
          label: "Parent Phone",
          type: "PHONE",
          required: false,
          unique: false,
          defaultValue: null,
          validation: null,
          visibility: "ALL",
          order: 1,
          helpText: "Primary parent contact",
          options: null,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const fields = await getCanonicalFields("STUDENT");
      const parentPhoneField = fields.find((f) => f.key === "parentPhone");

      expect(parentPhoneField).toBeDefined();
      expect(parentPhoneField?.isCustom).toBe(true);
      expect(parentPhoneField?.label).toBe("Parent Phone");
      expect(parentPhoneField?.type).toBe("PHONE");
    });
  });

  describe("Prioritized Auto-Suggestion Algorithm", () => {
    let canonicalFields: CanonicalField[];

    beforeEach(async () => {
      canonicalFields = await getCanonicalFields("STUDENT");
    });

    it("Stage 1: Matches exact field key or label", () => {
      const matchKey = matchSingleHeader(
        "registerNumber",
        canonicalFields,
        "STUDENT"
      );
      expect(matchKey.suggestedKey).toBe("registerNumber");
      expect(matchKey.matchReason).toBe("EXACT");
      expect(matchKey.confidence).toBe("HIGH");

      const matchLabel = matchSingleHeader(
        "Student Full Name",
        canonicalFields,
        "STUDENT"
      );
      expect(matchLabel.suggestedKey).toBe("name");
      expect(matchLabel.matchReason).toBe("EXACT");
    });

    it("Stage 2: Matches case-insensitive header", () => {
      const match = matchSingleHeader(
        "REGISTERNUMBER",
        canonicalFields,
        "STUDENT"
      );
      expect(match.suggestedKey).toBe("registerNumber");
      expect(match.matchReason).toBe("CASE_INSENSITIVE");
    });

    it("Stage 3: Matches trimmed and whitespace-normalized header", () => {
      const match = matchSingleHeader(
        "  Student   Full   Name  ",
        canonicalFields,
        "STUDENT"
      );
      expect(match.suggestedKey).toBe("name");
      expect(match.matchReason).toBe("TRIMMED");
    });

    it("Stage 4: Matches underscore-normalized header", () => {
      const match = matchSingleHeader(
        "register_number",
        canonicalFields,
        "STUDENT"
      );
      expect(match.suggestedKey).toBe("registerNumber");
      expect(match.matchReason).toBe("UNDERSCORE_NORMALIZED");
    });

    it("Stage 5: Matches spec §15 aliases correctly", () => {
      // "Admission Number" -> registerNumber
      const admMatch = matchSingleHeader(
        "Admission Number",
        canonicalFields,
        "STUDENT"
      );
      expect(admMatch.suggestedKey).toBe("registerNumber");
      expect(admMatch.matchReason).toBe("ALIAS");

      // "Branch" -> department
      const branchMatch = matchSingleHeader(
        "Branch",
        canonicalFields,
        "STUDENT"
      );
      expect(branchMatch.suggestedKey).toBe("department");
      expect(branchMatch.matchReason).toBe("ALIAS");

      // "Current Sem" -> academicPeriod
      const semMatch = matchSingleHeader(
        "Current Sem",
        canonicalFields,
        "STUDENT"
      );
      expect(semMatch.suggestedKey).toBe("academicPeriod");
      expect(semMatch.matchReason).toBe("ALIAS");

      // "WhatsApp No" -> phone
      const phoneMatch = matchSingleHeader(
        "WhatsApp No",
        canonicalFields,
        "STUDENT"
      );
      expect(phoneMatch.suggestedKey).toBe("phone");
      expect(phoneMatch.matchReason).toBe("ALIAS");

      // "Candidate Name" -> name
      const candMatch = matchSingleHeader(
        "Candidate Name",
        canonicalFields,
        "STUDENT"
      );
      expect(candMatch.suggestedKey).toBe("name");
      expect(candMatch.matchReason).toBe("ALIAS");

      // "Reg No" / "USN" / "Roll No" -> registerNumber
      expect(
        matchSingleHeader("Reg No", canonicalFields, "STUDENT").suggestedKey
      ).toBe("registerNumber");
      expect(
        matchSingleHeader("USN", canonicalFields, "STUDENT").suggestedKey
      ).toBe("registerNumber");
      expect(
        matchSingleHeader("Roll No", canonicalFields, "STUDENT").suggestedKey
      ).toBe("registerNumber");
    });

    it("Returns NONE for unknown / unmatchable column header", () => {
      const match = matchSingleHeader(
        "Random Unrelated Column",
        canonicalFields,
        "STUDENT"
      );
      expect(match.suggestedKey).toBeNull();
      expect(match.confidence).toBe("NONE");
      expect(match.matchReason).toBe("NONE");
    });
  });

  describe("suggestColumnMappings with Saved Templates", () => {
    it("suggests mappings for whole header list and flags unmapped required fields", async () => {
      const sourceHeaders = [
        "Admission Number",
        "Candidate Name",
        "Branch",
        "Extra Column",
      ];

      const result = await suggestColumnMappings(sourceHeaders, "STUDENT");

      expect(result.suggestions["Admission Number"].suggestedKey).toBe(
        "registerNumber"
      );
      expect(result.suggestions["Candidate Name"].suggestedKey).toBe("name");
      expect(result.suggestions["Branch"].suggestedKey).toBe("department");
      expect(result.suggestions["Extra Column"].suggestedKey).toBeNull();

      // Program, Batch, AcademicPeriod are required and missing
      expect(result.unmappedRequiredKeys).toContain("program");
      expect(result.unmappedRequiredKeys).toContain("batch");
      expect(result.unmappedRequiredKeys).toContain("academicPeriod");
    });

    it("auto-suggests a saved template when header overlap is high", async () => {
      const template = {
        id: "tmpl_1",
        name: "Standard ERP Template",
        entityType: "STUDENT",
        mapping: {
          "Student ID": "registerNumber",
          "Full Name": "name",
          "Dept Code": "department",
          Degree: "program",
          "Batch Year": "batch",
          "Current Sem": "academicPeriod",
        },
        isDefault: false,
        description: "Official ERP export mapping",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(repo.listImportMappings).mockResolvedValue([template]);

      const sourceHeaders = [
        "Student ID",
        "Full Name",
        "Dept Code",
        "Degree",
        "Batch Year",
        "Current Sem",
      ];

      const result = await suggestColumnMappings(sourceHeaders, "STUDENT");

      expect(result.matchedTemplate).toBeDefined();
      expect(result.matchedTemplate?.id).toBe("tmpl_1");
      expect(result.matchedTemplate?.name).toBe("Standard ERP Template");
      expect(result.suggestions["Student ID"].suggestedKey).toBe(
        "registerNumber"
      );
      expect(result.suggestions["Student ID"].matchReason).toBe("TEMPLATE");
      expect(result.unmappedRequiredKeys).toHaveLength(0);
    });
  });

  describe("Data Row Transformation (applyColumnMapping)", () => {
    it("transforms raw rows according to confirmed mapping and ignores skipped columns", () => {
      const rawRows = [
        {
          __rowNumber: 2,
          "Admission Number": "22CS001",
          "Candidate Name": "Alice Smith",
          "Ignored Notes": "Some note",
          "Mobile Phone": "9876543210",
        },
        {
          __rowNumber: 3,
          "Admission Number": "22CS002",
          "Candidate Name": "Bob Jones",
          "Ignored Notes": "Other note",
          "Mobile Phone": "9123456780",
        },
      ];

      const mapping = {
        "Admission Number": "registerNumber",
        "Candidate Name": "name",
        "Ignored Notes": "__ignore__",
        "Mobile Phone": "phone",
      };

      const mapped = applyColumnMapping(rawRows, mapping);

      expect(mapped).toHaveLength(2);
      expect(mapped[0]).toEqual({
        __rowNumber: 2,
        registerNumber: "22CS001",
        name: "Alice Smith",
        phone: "9876543210",
      });
      expect(mapped[1]).toEqual({
        __rowNumber: 3,
        registerNumber: "22CS002",
        name: "Bob Jones",
        phone: "9123456780",
      });
    });
  });

  describe("Template CRUD Operations", () => {
    const mockUser = { id: "user_admin", email: "admin@college.edu" };

    it("saves a new mapping template", async () => {
      const created = {
        id: "tmpl_new",
        name: "University Roster",
        entityType: "STUDENT",
        mapping: { "Reg No": "registerNumber" },
        isDefault: true,
        description: "Test template",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(repo.findImportMappingByName).mockResolvedValue(null);
      vi.mocked(repo.createImportMapping).mockResolvedValue(created);

      const res = await saveMappingTemplateService(mockUser, {
        name: "University Roster",
        entityType: "STUDENT",
        mapping: { "Reg No": "registerNumber" },
        isDefault: true,
      });

      expect(res.id).toBe("tmpl_new");
      expect(res.name).toBe("University Roster");
      expect(repo.clearDefaultImportMappings).toHaveBeenCalledWith("STUDENT");
    });

    it("lists templates for an entity type", async () => {
      vi.mocked(repo.listImportMappings).mockResolvedValue([
        {
          id: "tmpl_1",
          name: "Template 1",
          entityType: "STUDENT",
          mapping: {},
          isDefault: true,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const list = await listMappingTemplatesService(mockUser, "STUDENT");
      expect(list).toHaveLength(1);
      expect(list[0].name).toBe("Template 1");
    });

    it("gets a mapping template by ID", async () => {
      vi.mocked(repo.findImportMappingById).mockResolvedValue({
        id: "tmpl_1",
        name: "Template 1",
        entityType: "STUDENT",
        mapping: { "Reg No": "registerNumber" },
        isDefault: false,
        description: "Desc",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const template = await getMappingTemplateService(mockUser, "tmpl_1");
      expect(template.id).toBe("tmpl_1");
      expect(template.name).toBe("Template 1");
      expect(template.mapping["Reg No"]).toBe("registerNumber");
    });

    it("deletes a mapping template by ID", async () => {
      vi.mocked(repo.findImportMappingById).mockResolvedValue({
        id: "tmpl_del",
        name: "To Delete",
        entityType: "STUDENT",
        mapping: {},
        isDefault: false,
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.mocked(repo.deleteImportMapping).mockResolvedValue({} as never);

      const res = await deleteMappingTemplateService(mockUser, "tmpl_del");
      expect(res.success).toBe(true);
      expect(repo.deleteImportMapping).toHaveBeenCalledWith("tmpl_del");
    });
  });
});
