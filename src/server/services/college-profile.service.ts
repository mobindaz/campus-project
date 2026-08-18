/**
 * REFERENCE SERVICE PATTERN - COLLEGE PROFILE & SETUP WIZARD
 * ==========================================================
 * Manages college branding, contact settings, and first-run setup wizard step progression.
 *
 * 1. Server-Side Authorization: Invokes `authorize(user, permission)`.
 * 2. Zod Input Validation: Parses profile schema strictly.
 * 3. Step Progression Locks: Checks database counts for departments, programs, periods, and users.
 * 4. Audit Logging: Dispatches platform audit events.
 */

import { authorize, AuthUser } from "@/server/authorization";
import { prisma } from "@/server/database";
import {
  getCollegeProfile,
  markCollegeConfigured,
  upsertCollegeProfile,
} from "@/server/repositories/college-profile.repository";
import { logAudit } from "@/server/services/audit.service";
import {
  collegeProfileSchema,
  CollegeProfileInput,
} from "@/modules/settings/schemas";

export async function getCollegeProfileService(user?: AuthUser | null) {
  // Public or authenticated access for college profile
  if (user) {
    await authorize(user, "settings.manage");
  }
  return getCollegeProfile();
}

export async function updateCollegeProfileService(
  user: AuthUser | null | undefined,
  input: CollegeProfileInput
) {
  const authResult = await authorize(user, "settings.manage");

  const parsed = collegeProfileSchema.parse(input);

  const updatedProfile = await upsertCollegeProfile({
    name: parsed.name.trim(),
    logoUrl: parsed.logoUrl || null,
    address: parsed.address?.trim() || null,
    city: parsed.city?.trim() || null,
    state: parsed.state?.trim() || null,
    postalCode: parsed.postalCode?.trim() || null,
    country: parsed.country?.trim() || "India",
    contactEmail: parsed.contactEmail?.trim() || null,
    contactPhone: parsed.contactPhone?.trim() || null,
    website: parsed.website?.trim() || null,
    primaryColor: parsed.primaryColor,
    secondaryColor: parsed.secondaryColor,
  });

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "COLLEGE_PROFILE_UPDATE",
    entity: "CollegeProfile",
    entityId: updatedProfile.id,
    details: {
      name: updatedProfile.name,
      primaryColor: updatedProfile.primaryColor,
    },
  });

  return updatedProfile;
}

export async function getSetupWizardStatusService() {
  const [profile, deptCount, programCount, periodCount, userCount] =
    await Promise.all([
      getCollegeProfile(),
      prisma.department.count(),
      prisma.program.count(),
      prisma.academicPeriod.count(),
      prisma.user.count(),
    ]);

  const step1Profile = Boolean(
    profile.name && profile.name !== "Campus Operations College"
  );
  const step2Department = deptCount > 0;
  const step3Program = programCount > 0;
  const step4AcademicStructure = periodCount > 0;
  const step5AdminUser = userCount > 0;

  const isConfigured =
    profile.isConfigured ||
    (step1Profile &&
      step2Department &&
      step3Program &&
      step4AcademicStructure &&
      step5AdminUser);

  const allowSkipEnv = process.env.NEXT_PUBLIC_ALLOW_SETUP_SKIP === "true";

  return {
    isConfigured,
    allowSkipEnv,
    profile,
    steps: {
      step1Profile,
      step2Department,
      step3Program,
      step4AcademicStructure,
      step5AdminUser,
    },
    counts: {
      deptCount,
      programCount,
      periodCount,
      userCount,
    },
  };
}

export async function completeSetupWizardService(
  user: AuthUser | null | undefined
) {
  const status = await getSetupWizardStatusService();

  if (!status.steps.step2Department) {
    throw new Error(
      "Cannot complete setup wizard: At least 1 Department is required."
    );
  }
  if (!status.steps.step3Program) {
    throw new Error(
      "Cannot complete setup wizard: At least 1 Program is required."
    );
  }
  if (!status.steps.step4AcademicStructure) {
    throw new Error(
      "Cannot complete setup wizard: At least 1 Academic Period is required."
    );
  }

  const authResult = await authorize(user, "settings.manage");

  const configuredProfile = await markCollegeConfigured(true);

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "SETUP_WIZARD_COMPLETE",
    entity: "CollegeProfile",
    entityId: configuredProfile.id,
    details: {
      collegeName: configuredProfile.name,
    },
  });

  return configuredProfile;
}

/**
 * Demo Data Seeder helper when NEXT_PUBLIC_ALLOW_SETUP_SKIP=true is enabled for developers.
 */
export async function seedDemoDataService(user: AuthUser | null | undefined) {
  const allowSkipEnv = process.env.NEXT_PUBLIC_ALLOW_SETUP_SKIP === "true";
  if (!allowSkipEnv) {
    throw new Error(
      "Demo seed is disabled. Set NEXT_PUBLIC_ALLOW_SETUP_SKIP=true in environment."
    );
  }

  const authResult = await authorize(user, "settings.manage");

  // 1. Update Profile
  const profile = await upsertCollegeProfile({
    name: "St. Xavier's College of Engineering",
    address: "123 Tech Campus Road",
    city: "Mumbai",
    state: "Maharashtra",
    postalCode: "400001",
    country: "India",
    contactEmail: "info@xavier.edu",
    contactPhone: "+91 22 2847 1000",
    website: "https://xavier.edu",
    primaryColor: "#4F46E5",
    secondaryColor: "#06B6D4",
    isConfigured: true,
  });

  // 2. Ensure Demo Department
  let cseDept = await prisma.department.findUnique({ where: { code: "CSE" } });
  if (!cseDept) {
    cseDept = await prisma.department.create({
      data: {
        name: "Computer Science & Engineering",
        code: "CSE",
        type: "ACADEMIC",
        description: "Department of Computer Science & Engineering",
      },
    });
  }

  // 3. Ensure Demo Program
  let btechProg = await prisma.program.findUnique({
    where: { code: "BTECH_CSE" },
  });
  if (!btechProg) {
    btechProg = await prisma.program.create({
      data: {
        name: "Bachelor of Technology in Computer Science",
        code: "BTECH_CSE",
        shortName: "B.Tech CSE",
        type: "DEGREE",
        durationYears: 4,
        departmentId: cseDept.id,
      },
    });
  }

  // 4. Ensure Demo Academic Periods (8 Semesters)
  const existingPeriods = await prisma.academicPeriod.count({
    where: { programId: btechProg.id },
  });

  if (existingPeriods === 0) {
    const periods = Array.from({ length: 8 }).map((_, idx) => ({
      name: `Semester ${idx + 1}`,
      code: `SEM_${idx + 1}`,
      pattern: "SEMESTER" as const,
      orderIndex: idx + 1,
      programId: btechProg.id,
      isActive: true,
    }));
    await prisma.academicPeriod.createMany({ data: periods });
  }

  // 5. Ensure Demo Batch
  const existingBatch = await prisma.batch.findUnique({
    where: {
      programId_code: {
        programId: btechProg.id,
        code: "B2024_A",
      },
    },
  });

  if (!existingBatch) {
    await prisma.batch.create({
      data: {
        name: "2024-2028 Batch A",
        code: "B2024_A",
        academicYear: "2024-2028",
        admissionYear: 2024,
        graduationYear: 2028,
        section: "A",
        programId: btechProg.id,
      },
    });
  }

  await logAudit({
    userId: authResult.userId,
    userEmail: user?.email,
    action: "SETUP_WIZARD_DEMO_SEED",
    entity: "CollegeProfile",
    entityId: profile.id,
    details: {
      message:
        "Seeded demo college profile, CSE department, BTech program, 8 semesters, and batch A.",
    },
  });

  return profile;
}
