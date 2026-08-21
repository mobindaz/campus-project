import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

export const DEFAULT_ROLES = [
  {
    name: "College Admin",
    code: "college_admin",
    description: "Full system administration access with all permissions",
    isSystem: true,
  },
  {
    name: "Principal",
    code: "principal",
    description:
      "Institutional head with college-wide approval and read access",
    isSystem: true,
  },
  {
    name: "HOD",
    code: "hod",
    description: "Head of Department with department-scoped approval authority",
    isSystem: true,
  },
  {
    name: "Placement Officer",
    code: "placement_officer",
    description:
      "Manages placement drives, company registrations, and placement results",
    isSystem: true,
  },
  {
    name: "Faculty",
    code: "faculty",
    description:
      "Teaching staff with student view and clearance workflow participation",
    isSystem: true,
  },
  {
    name: "Librarian",
    code: "librarian",
    description: "Library staff with TC clearance approval authority",
    isSystem: true,
  },
  {
    name: "Accountant",
    code: "accountant",
    description: "Finance staff with fee clearance approval authority",
    isSystem: true,
  },
  {
    name: "Student",
    code: "student",
    description:
      "Student user with personal profile, placement application, and TC request access",
    isSystem: true,
  },
];

export const DEFAULT_PERMISSIONS = [
  // Students module
  {
    code: "students.create",
    name: "Create Students",
    module: "students",
    description: "Register new student records",
  },
  {
    code: "students.read",
    name: "Read Students",
    module: "students",
    description: "View student profiles and records",
  },
  {
    code: "students.update",
    name: "Update Students",
    module: "students",
    description: "Modify student details",
  },
  {
    code: "students.delete",
    name: "Delete Students",
    module: "students",
    description: "Archive or delete student records",
  },

  // Placement module
  {
    code: "placement.create",
    name: "Create Placement Drives",
    module: "placement",
    description: "Create placement opportunities and drives",
  },
  {
    code: "placement.read",
    name: "Read Placement Drives",
    module: "placement",
    description: "View placement drives and registrations",
  },
  {
    code: "placement.update",
    name: "Update Placement Drives",
    module: "placement",
    description: "Modify placement drive details",
  },
  {
    code: "placement.delete",
    name: "Delete Placement Drives",
    module: "placement",
    description: "Cancel or remove placement drives",
  },
  {
    code: "placement.manage",
    name: "Manage Placements",
    module: "placement",
    description: "Full placement module administration",
  },

  // TC module
  {
    code: "tc.create",
    name: "Create TC Request",
    module: "tc",
    description: "Initiate Transfer Certificate request",
  },
  {
    code: "tc.read",
    name: "Read TC Requests",
    module: "tc",
    description: "View TC requests and status",
  },
  {
    code: "tc.update",
    name: "Update TC Requests",
    module: "tc",
    description: "Modify TC request details",
  },
  {
    code: "tc.approve",
    name: "Approve TC Clearances",
    module: "tc",
    description: "Grant clearance approvals for TC",
  },
  {
    code: "tc.manage",
    name: "Manage TC Engine",
    module: "tc",
    description: "Full TC workflow administration",
  },

  // Department module
  {
    code: "departments.create",
    name: "Create Departments",
    module: "departments",
    description: "Create academic departments and administrative offices",
  },
  {
    code: "departments.read",
    name: "Read Departments",
    module: "departments",
    description: "View departments list and details",
  },
  {
    code: "departments.update",
    name: "Update Departments",
    module: "departments",
    description: "Modify department configurations and status",
  },
  {
    code: "departments.delete",
    name: "Delete Departments",
    module: "departments",
    description: "Deactivate or remove departments",
  },
  {
    code: "departments.manage",
    name: "Manage Departments",
    module: "departments",
    description: "Full department module administration",
  },

  // Program module
  {
    code: "programs.create",
    name: "Create Programs",
    module: "programs",
    description: "Create degree, diploma, and certificate programs",
  },
  {
    code: "programs.read",
    name: "Read Programs",
    module: "programs",
    description: "View programs list and details",
  },
  {
    code: "programs.update",
    name: "Update Programs",
    module: "programs",
    description: "Modify program details and status",
  },
  {
    code: "programs.delete",
    name: "Delete Programs",
    module: "programs",
    description: "Deactivate or remove programs",
  },
  {
    code: "programs.manage",
    name: "Manage Programs",
    module: "programs",
    description: "Full program module administration",
  },

  // Platform Engines & Management
  {
    code: "structure.manage",
    name: "Manage Academic Structure",
    module: "structure",
    description: "Configure academic periods and student admission batches",
  },
  {
    code: "workflow.manage",
    name: "Manage Workflows",
    module: "workflow",
    description: "Configure approval chains and workflow steps",
  },
  {
    code: "forms.manage",
    name: "Manage Dynamic Forms",
    module: "forms",
    description: "Create and edit dynamic form definitions",
  },
  {
    code: "fields.manage",
    name: "Manage Custom Fields",
    module: "fields",
    description: "Define custom fields for entities",
  },
  {
    code: "reports.read",
    name: "Read Reports",
    module: "reports",
    description: "View system reports and analytics",
  },
  {
    code: "reports.export",
    name: "Export Reports",
    module: "reports",
    description: "Export reports to Excel/PDF",
  },
  {
    code: "settings.manage",
    name: "Manage Platform Settings",
    module: "settings",
    description: "Manage college deployment configurations",
  },
];

export const DEMO_PROGRAMS = [
  {
    name: "Bachelor of Technology",
    code: "BTECH",
    shortName: "B.Tech",
    type: "DEGREE" as const,
    durationYears: 4,
  },
  {
    name: "Diploma in Engineering",
    code: "DIPLOMA",
    shortName: "Diploma",
    type: "DIPLOMA" as const,
    durationYears: 3,
  },
  {
    name: "Bachelor of Computer Applications",
    code: "BCA",
    shortName: "BCA",
    type: "DEGREE" as const,
    durationYears: 3,
  },
];

export const DEMO_DEPARTMENTS = [
  {
    name: "Computer Science & Engineering",
    code: "CSE",
    description: "Department of Computer Science & Engineering",
    programCode: "BTECH",
  },
  {
    name: "Mechanical Engineering",
    code: "MECH",
    description: "Department of Mechanical Engineering",
    programCode: "BTECH",
  },
];

/**
 * Executes core initial system reference data seeding.
 * Ensures initial database contains only essential RBAC, profile, and initial demo admin account.
 */
export async function seedSystemReferenceData(db: PrismaClient = prisma) {
  console.log(
    "🌱 Seeding System Reference Data (RBAC roles, permissions, initial admin)..."
  );

  // 1. Seed Roles
  const roleMap = new Map<string, string>();
  for (const roleData of DEFAULT_ROLES) {
    const role = await db.role.upsert({
      where: { code: roleData.code },
      update: {
        name: roleData.name,
        description: roleData.description,
        isSystem: roleData.isSystem,
      },
      create: roleData,
    });
    roleMap.set(role.code, role.id);
  }

  // 2. Seed Permissions
  const createdPermissions = [];
  for (const permData of DEFAULT_PERMISSIONS) {
    const perm = await db.permission.upsert({
      where: { code: permData.code },
      update: {
        name: permData.name,
        module: permData.module,
        description: permData.description,
      },
      create: permData,
    });
    createdPermissions.push(perm);
  }

  // 3. Attach ALL permissions to College Admin role
  const collegeAdminRoleId = roleMap.get("college_admin");
  if (!collegeAdminRoleId) {
    throw new Error("College Admin role missing.");
  }

  const rolePermissionRecords = createdPermissions.map((perm) => ({
    roleId: collegeAdminRoleId,
    permissionId: perm.id,
  }));

  await db.rolePermission.createMany({
    data: rolePermissionRecords,
    skipDuplicates: true,
  });

  // 4. Ensure Initial College Profile
  let profile = await db.collegeProfile.findFirst();
  if (!profile) {
    profile = await db.collegeProfile.create({
      data: {
        name: "Campus Operations Platform",
        primaryColor: "#4F46E5",
        secondaryColor: "#06B6D4",
        isConfigured: false,
      },
    });
  }

  // 5. Seed Initial Demo/Development Admin User with hashed password
  const adminEmail = "admin@college.edu";
  const adminName = "Demo Administrator";
  const adminPassword = "Admin@12345";

  let adminUser = await db.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await hashPassword(adminPassword);

    adminUser = await db.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        emailVerified: true,
        accounts: {
          create: {
            providerId: "credential",
            accountId: adminEmail,
            password: hashedPassword,
          },
        },
      },
    });
  }

  if (adminUser) {
    await db.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: collegeAdminRoleId,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: collegeAdminRoleId,
      },
    });
  }

  return {
    rolesCount: roleMap.size,
    permissionsCount: createdPermissions.length,
    adminUserId: adminUser?.id,
  };
}

/**
 * Optional demo academic data seeding (enabled ONLY when SEED_DEMO_DATA=true is set).
 */
export async function seedDemoAcademicData(db: PrismaClient = prisma) {
  console.log("📦 Seeding Demo Academic Data (SEED_DEMO_DATA=true)...");
  const programMap = new Map<string, string>();

  for (const prog of DEMO_PROGRAMS) {
    const program = await db.program.upsert({
      where: { code: prog.code },
      update: {
        name: prog.name,
        shortName: prog.shortName,
        type: prog.type,
        durationYears: prog.durationYears,
      },
      create: prog,
    });
    programMap.set(program.code, program.id);
  }

  for (const dept of DEMO_DEPARTMENTS) {
    const programId = programMap.get(dept.programCode) || null;
    await db.department.upsert({
      where: { code: dept.code },
      update: {
        name: dept.name,
        description: dept.description,
        programId,
      },
      create: {
        name: dept.name,
        code: dept.code,
        description: dept.description,
        programId,
      },
    });
  }
}

async function main() {
  await seedSystemReferenceData(prisma);

  if (process.env.SEED_DEMO_DATA === "true") {
    await seedDemoAcademicData(prisma);
  } else {
    console.log(
      "ℹ️ Skipped demo academic data seeding (clean production install)."
    );
  }

  console.log("🎉 Seeding completed successfully.");
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("❌ Error during database seeding:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
