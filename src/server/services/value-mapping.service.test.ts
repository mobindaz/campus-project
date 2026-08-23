import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getAvailableFieldTargets,
  analyzeAndResolveFieldValues,
  applyValueMappings,
  saveValueMappingsService,
  listValueMappingsService,
  deleteValueMappingService,
} from "./value-mapping.service";

// Mock repositories
vi.mock("@/server/repositories/value-mapping.repository", () => ({
  listValueMappings: vi.fn(),
  findValueMapping: vi.fn(),
  findValueMappingsForField: vi.fn(),
  upsertValueMapping: vi.fn(),
  deleteValueMapping: vi.fn(),
}));

vi.mock("@/server/repositories/department.repository", () => ({
  listDepartments: vi.fn(),
}));

vi.mock("@/server/repositories/program.repository", () => ({
  listPrograms: vi.fn(),
}));

vi.mock("@/server/repositories/batch.repository", () => ({
  listBatches: vi.fn(),
}));

vi.mock("@/server/repositories/academic-period.repository", () => ({
  listAcademicPeriods: vi.fn(),
}));

vi.mock("@/server/repositories/custom-field.repository", () => ({
  findCustomFieldDefinitionByName: vi.fn(),
  listCustomFieldDefinitions: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi
    .fn()
    .mockResolvedValue([{ id: "r1", name: "Admin", code: "SUPER_ADMIN" }]),
  getUserDepartmentScopes: vi.fn().mockResolvedValue([]),
  getUserPermissions: vi.fn().mockResolvedValue(["imports.manage"]),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

import * as repo from "@/server/repositories/value-mapping.repository";
import * as deptRepo from "@/server/repositories/department.repository";
import * as progRepo from "@/server/repositories/program.repository";
import * as batchRepo from "@/server/repositories/batch.repository";
import * as periodRepo from "@/server/repositories/academic-period.repository";
import * as customRepo from "@/server/repositories/custom-field.repository";

describe("Value Mapping Engine Service (Spec §18)", () => {
  const mockUser = {
    id: "user_admin",
    name: "Admin User",
    email: "admin@college.edu",
  };

  const sampleDepartments = [
    {
      id: "dept_cse",
      name: "Computer Science & Engineering",
      code: "CSE",
      type: "ENGINEERING" as const,
      isActive: true,
      programId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "dept_ece",
      name: "Electronics & Communication Engineering",
      code: "ECE",
      type: "ENGINEERING" as const,
      isActive: true,
      programId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const samplePrograms = [
    {
      id: "prog_btech",
      name: "Bachelor of Technology",
      code: "BTECH",
      shortName: "B.Tech",
      type: "UNDERGRADUATE" as const,
      durationYears: 4,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deptRepo.listDepartments).mockResolvedValue(
      sampleDepartments as never
    );
    vi.mocked(progRepo.listPrograms).mockResolvedValue(samplePrograms as never);
    vi.mocked(batchRepo.listBatches).mockResolvedValue([]);
    vi.mocked(periodRepo.listAcademicPeriods).mockResolvedValue([]);
    vi.mocked(customRepo.listCustomFieldDefinitions).mockResolvedValue([]);
    vi.mocked(customRepo.findCustomFieldDefinitionByName).mockResolvedValue(
      null
    );
    vi.mocked(repo.findValueMappingsForField).mockResolvedValue([]);
  });

  describe("getAvailableFieldTargets", () => {
    it("returns active departments formatted as TargetOptions", async () => {
      const targets = await getAvailableFieldTargets("STUDENT", "department");
      expect(targets).toHaveLength(2);
      expect(targets[0]).toEqual({
        id: "dept_cse",
        label: "Computer Science & Engineering",
        code: "CSE",
        details: "ENGINEERING",
      });
    });

    it("returns active programs formatted as TargetOptions", async () => {
      const targets = await getAvailableFieldTargets("STUDENT", "program");
      expect(targets).toHaveLength(1);
      expect(targets[0]).toEqual({
        id: "prog_btech",
        label: "Bachelor of Technology",
        code: "BTECH",
        details: "B.Tech",
      });
    });

    it("returns custom field options when field is custom dropdown", async () => {
      vi.mocked(customRepo.findCustomFieldDefinitionByName).mockResolvedValue({
        id: "cf_category",
        entityType: "STUDENT",
        name: "studentCategory",
        label: "Category",
        type: "DROPDOWN",
        options: ["General", "OBC", "SC/ST"],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as never);

      const targets = await getAvailableFieldTargets(
        "STUDENT",
        "studentCategory"
      );
      expect(targets).toHaveLength(3);
      expect(targets[0]).toEqual({ id: "General", label: "General" });
    });
  });

  describe("analyzeAndResolveFieldValues", () => {
    it("resolves exact code matches with RESOLVED_EXACT and 1.0 confidence", async () => {
      const rows = [
        { department: "CSE", name: "Alice" },
        { department: "CSE", name: "Bob" },
      ];

      const result = await analyzeAndResolveFieldValues(
        rows,
        ["department"],
        "STUDENT"
      );

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.sourceValue).toBe("CSE");
      expect(item.occurrenceCount).toBe(2);
      expect(item.status).toBe("RESOLVED_EXACT");
      expect(item.resolvedTargetId).toBe("dept_cse");
      expect(item.resolvedTargetLabel).toBe("Computer Science & Engineering");
      expect(item.confidence).toBe(1.0);
    });

    it("resolves exact name matches with RESOLVED_EXACT", async () => {
      const rows = [
        { department: "Computer Science & Engineering", name: "Charlie" },
      ];

      const result = await analyzeAndResolveFieldValues(
        rows,
        ["department"],
        "STUDENT"
      );

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.status).toBe("RESOLVED_EXACT");
      expect(item.resolvedTargetId).toBe("dept_cse");
    });

    it("resolves saved persistent aliases with RESOLVED_ALIAS", async () => {
      vi.mocked(repo.findValueMappingsForField).mockResolvedValue([
        {
          id: "vm_1",
          entityType: "STUDENT",
          fieldKey: "department",
          sourceValue: "CS",
          targetId: "dept_cse",
          targetLabel: "Computer Science & Engineering",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const rows = [{ department: "CS", name: "David" }];

      const result = await analyzeAndResolveFieldValues(
        rows,
        ["department"],
        "STUDENT"
      );

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.sourceValue).toBe("CS");
      expect(item.status).toBe("RESOLVED_ALIAS");
      expect(item.resolvedTargetId).toBe("dept_cse");
      expect(item.resolvedTargetLabel).toBe("Computer Science & Engineering");
    });

    it("suggests candidate match with SUGGESTED_MATCH and requires confirmation (resolvedTargetId is null)", async () => {
      // "Comp Sci" is not an exact code or saved alias, but heuristic similarity is high
      const rows = [{ department: "Comp Sci", name: "Eve" }];

      const result = await analyzeAndResolveFieldValues(
        rows,
        ["department"],
        "STUDENT"
      );

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.sourceValue).toBe("Comp Sci");
      expect(item.status).toBe("SUGGESTED_MATCH");
      // Must NOT be silently resolved (Spec §18)
      expect(item.resolvedTargetId).toBeNull();
      expect(item.suggestedTargetId).toBe("dept_cse");
      expect(item.suggestedTargetLabel).toBe("Computer Science & Engineering");
      expect(item.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.allResolved).toBe(false);
      expect(result.requiresConfirmationCount).toBe(1);
    });

    it("flags completely unknown values with UNRESOLVED and 0 confidence", async () => {
      const rows = [
        { department: "Biotechnology & Bioinformatics", name: "Frank" },
      ];

      const result = await analyzeAndResolveFieldValues(
        rows,
        ["department"],
        "STUDENT"
      );

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.sourceValue).toBe("Biotechnology & Bioinformatics");
      expect(item.status).toBe("UNRESOLVED");
      expect(item.resolvedTargetId).toBeNull();
      expect(item.suggestedTargetId).toBeNull();
      expect(item.confidence).toBe(0);
      expect(result.unresolvedCount).toBe(1);
      expect(result.allResolved).toBe(false);
    });
  });

  describe("applyValueMappings", () => {
    it("substitutes raw source strings with target IDs in row dataset", () => {
      const rows = [
        { name: "Alice", department: "CSE", program: "B.Tech" },
        { name: "Bob", department: "CS", program: "B.Tech" },
        { name: "Charlie", department: "ECE", program: "B.Tech" },
      ];

      const valueMap = {
        department: {
          CSE: "dept_cse",
          CS: "dept_cse",
          ECE: "dept_ece",
        },
        program: {
          "B.Tech": "prog_btech",
        },
      };

      const transformed = applyValueMappings(rows, valueMap);

      expect(transformed[0].department).toBe("dept_cse");
      expect(transformed[0].program).toBe("prog_btech");
      expect(transformed[1].department).toBe("dept_cse");
      expect(transformed[2].department).toBe("dept_ece");
      expect(transformed[0].name).toBe("Alice"); // non-mapped fields preserved
    });
  });

  describe("Persistent Value Mappings Management", () => {
    it("saves value mapping aliases into database", async () => {
      vi.mocked(repo.upsertValueMapping).mockResolvedValue({
        id: "vm_new",
        entityType: "STUDENT",
        fieldKey: "department",
        sourceValue: "CSE",
        targetId: "dept_cse",
        targetLabel: "Computer Science & Engineering",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await saveValueMappingsService(mockUser, [
        {
          entityType: "STUDENT",
          fieldKey: "department",
          sourceValue: "CSE",
          targetId: "dept_cse",
          targetLabel: "Computer Science & Engineering",
        },
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("vm_new");
      expect(repo.upsertValueMapping).toHaveBeenCalledWith({
        entityType: "STUDENT",
        fieldKey: "department",
        sourceValue: "CSE",
        targetId: "dept_cse",
        targetLabel: "Computer Science & Engineering",
      });
    });

    it("lists persistent value mappings", async () => {
      vi.mocked(repo.listValueMappings).mockResolvedValue([
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
      ]);

      const list = await listValueMappingsService(
        mockUser,
        "STUDENT",
        "department"
      );
      expect(list).toHaveLength(1);
      expect(list[0].sourceValue).toBe("CSE");
    });

    it("deletes a value mapping alias", async () => {
      vi.mocked(repo.listValueMappings).mockResolvedValue([
        {
          id: "vm_del",
          entityType: "STUDENT",
          fieldKey: "department",
          sourceValue: "CSE",
          targetId: "dept_cse",
          targetLabel: "Computer Science & Engineering",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      vi.mocked(repo.deleteValueMapping).mockResolvedValue({} as never);

      const res = await deleteValueMappingService(mockUser, "vm_del");
      expect(res.success).toBe(true);
      expect(repo.deleteValueMapping).toHaveBeenCalledWith("vm_del");
    });
  });
});
