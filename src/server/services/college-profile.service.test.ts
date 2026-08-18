import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCollegeProfileService,
  updateCollegeProfileService,
  getSetupWizardStatusService,
  completeSetupWizardService,
} from "./college-profile.service";
import * as profileRepo from "@/server/repositories/college-profile.repository";
import * as rbacService from "@/server/services/rbac.service";
import { prisma } from "@/server/database";

vi.mock("@/server/repositories/college-profile.repository", () => ({
  getCollegeProfile: vi.fn(),
  upsertCollegeProfile: vi.fn(),
  markCollegeConfigured: vi.fn(),
  isCollegeConfigured: vi.fn(),
}));

vi.mock("@/server/services/rbac.service", () => ({
  getUserRoles: vi.fn(),
  getUserPermissions: vi.fn(),
  getUserDepartmentScopes: vi.fn(),
}));

vi.mock("@/server/services/audit.service", () => ({
  logAudit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/server/database", () => ({
  prisma: {
    department: { count: vi.fn() },
    program: { count: vi.fn() },
    academicPeriod: { count: vi.fn() },
    user: { count: vi.fn() },
    batch: { count: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  },
}));

describe("College Profile Service", () => {
  const adminUser = {
    id: "user_admin",
    name: "Admin User",
    email: "admin@college.edu",
  };

  const mockProfile = {
    id: "prof_1",
    name: "Campus Operations College",
    logoUrl: null,
    address: null,
    city: null,
    state: null,
    postalCode: null,
    country: "India",
    contactEmail: null,
    contactPhone: null,
    website: null,
    primaryColor: "#4F46E5",
    secondaryColor: "#06B6D4",
    isConfigured: false,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rbacService.getUserRoles).mockResolvedValue([mockAdminRole]);
    vi.mocked(rbacService.getUserPermissions).mockResolvedValue([]);
    vi.mocked(rbacService.getUserDepartmentScopes).mockResolvedValue([]);
  });

  describe("Profile Management", () => {
    it("retrieves the college profile", async () => {
      vi.mocked(profileRepo.getCollegeProfile).mockResolvedValue(mockProfile);

      const profile = await getCollegeProfileService(adminUser);
      expect(profile.name).toBe("Campus Operations College");
    });

    it("updates college profile attributes", async () => {
      vi.mocked(profileRepo.upsertCollegeProfile).mockResolvedValue({
        ...mockProfile,
        name: "St. Xavier's Engineering",
      });

      const result = await updateCollegeProfileService(adminUser, {
        name: "St. Xavier's Engineering",
        country: "India",
        primaryColor: "#4F46E5",
        secondaryColor: "#06B6D4",
      });

      expect(result.name).toBe("St. Xavier's Engineering");
      expect(profileRepo.upsertCollegeProfile).toHaveBeenCalled();
    });
  });

  describe("Setup Wizard Status Checks", () => {
    it("reports wizard step status based on entity counts", async () => {
      vi.mocked(profileRepo.getCollegeProfile).mockResolvedValue(mockProfile);
      vi.mocked(prisma.department.count).mockResolvedValue(2);
      vi.mocked(prisma.program.count).mockResolvedValue(1);
      vi.mocked(prisma.academicPeriod.count).mockResolvedValue(8);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      const status = await getSetupWizardStatusService();

      expect(status.steps.step2Department).toBe(true);
      expect(status.steps.step3Program).toBe(true);
      expect(status.steps.step4AcademicStructure).toBe(true);
      expect(status.steps.step5AdminUser).toBe(true);
    });

    it("prevents completing setup wizard if department count is 0", async () => {
      vi.mocked(profileRepo.getCollegeProfile).mockResolvedValue(mockProfile);
      vi.mocked(prisma.department.count).mockResolvedValue(0);
      vi.mocked(prisma.program.count).mockResolvedValue(0);
      vi.mocked(prisma.academicPeriod.count).mockResolvedValue(0);
      vi.mocked(prisma.user.count).mockResolvedValue(1);

      await expect(completeSetupWizardService(adminUser)).rejects.toThrow(
        "Cannot complete setup wizard"
      );
    });
  });
});
