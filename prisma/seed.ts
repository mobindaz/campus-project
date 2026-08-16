import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  {
    name: "College Admin",
    code: "college_admin",
    description: "Full system administration access with all permissions",
    isSystem: true,
  },
  {
    name: "Principal",
    code: "principal",
    description: "Institutional head with college-wide approval and read access",
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
    description: "Manages placement drives, company registrations, and placement results",
    isSystem: true,
  },
  {
    name: "Faculty",
    code: "faculty",
    description: "Teaching staff with student view and clearance workflow participation",
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
    description: "Student user with personal profile, placement application, and TC request access",
    isSystem: true,
  },
];

const DEFAULT_DEPARTMENTS = [
  { name: "Computer Science & Engineering", code: "CSE", description: "Department of Computer Science & Engineering" },
  { name: "Mechanical Engineering", code: "MECH", description: "Department of Mechanical Engineering" },
  { name: "Electronics & Communication Engineering", code: "ECE", description: "Department of Electronics & Communication Engineering" },
  { name: "Civil Engineering", code: "CIVIL", description: "Department of Civil Engineering" },
  { name: "General Engineering", code: "GEN", description: "Department of General Sciences & Humanities" },
];

const DEFAULT_PERMISSIONS = [
  // Students module
  { code: "students.create", name: "Create Students", module: "students", description: "Register new student records" },
  { code: "students.read", name: "Read Students", module: "students", description: "View student profiles and records" },
  { code: "students.update", name: "Update Students", module: "students", description: "Modify student details" },
  { code: "students.delete", name: "Delete Students", module: "students", description: "Archive or delete student records" },

  // Placement module
  { code: "placement.create", name: "Create Placement Drives", module: "placement", description: "Create placement opportunities and drives" },
  { code: "placement.read", name: "Read Placement Drives", module: "placement", description: "View placement drives and registrations" },
  { code: "placement.update", name: "Update Placement Drives", module: "placement", description: "Modify placement drive details" },
  { code: "placement.delete", name: "Delete Placement Drives", module: "placement", description: "Cancel or remove placement drives" },
  { code: "placement.manage", name: "Manage Placements", module: "placement", description: "Full placement module administration" },

  // TC module
  { code: "tc.create", name: "Create TC Request", module: "tc", description: "Initiate Transfer Certificate request" },
  { code: "tc.read", name: "Read TC Requests", module: "tc", description: "View TC requests and status" },
  { code: "tc.update", name: "Update TC Requests", module: "tc", description: "Modify TC request details" },
  { code: "tc.approve", name: "Approve TC Clearances", module: "tc", description: "Grant clearance approvals for TC" },
  { code: "tc.manage", name: "Manage TC Engine", module: "tc", description: "Full TC workflow administration" },

  // Department module
  { code: "departments.create", name: "Create Departments", module: "departments", description: "Create academic departments and administrative offices" },
  { code: "departments.read", name: "Read Departments", module: "departments", description: "View departments list and details" },
  { code: "departments.update", name: "Update Departments", module: "departments", description: "Modify department configurations and status" },
  { code: "departments.delete", name: "Delete Departments", module: "departments", description: "Deactivate or remove departments" },
  { code: "departments.manage", name: "Manage Departments", module: "departments", description: "Full department module administration" },

  // Platform Engines & Management
  { code: "workflow.manage", name: "Manage Workflows", module: "workflow", description: "Configure approval chains and workflow steps" },
  { code: "forms.manage", name: "Manage Dynamic Forms", module: "forms", description: "Create and edit dynamic form definitions" },
  { code: "fields.manage", name: "Manage Custom Fields", module: "fields", description: "Define custom fields for entities" },
  { code: "reports.read", name: "Read Reports", module: "reports", description: "View system reports and analytics" },
  { code: "reports.export", name: "Export Reports", module: "reports", description: "Export reports to Excel/PDF" },
  { code: "settings.manage", name: "Manage Platform Settings", module: "settings", description: "Manage college deployment configurations" },
];

async function main() {
  console.log("🌱 Seeding database with RBAC roles, permissions, departments, and College Admin...");

  // 1. Seed Departments
  console.log("Creating departments...");
  const createdDepartments = [];
  for (const dept of DEFAULT_DEPARTMENTS) {
    const department = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, description: dept.description },
      create: dept,
    });
    createdDepartments.push(department);
  }
  console.log(`✅ Seeded ${createdDepartments.length} departments.`);

  // 2. Seed Roles
  console.log("Creating default roles...");
  const roleMap = new Map<string, string>();
  for (const roleData of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { code: roleData.code },
      update: { name: roleData.name, description: roleData.description, isSystem: roleData.isSystem },
      create: roleData,
    });
    roleMap.set(role.code, role.id);
  }
  console.log(`✅ Seeded ${roleMap.size} roles.`);

  // 3. Seed Permissions
  console.log("Creating default permissions...");
  const createdPermissions = [];
  for (const permData of DEFAULT_PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { code: permData.code },
      update: { name: permData.name, module: permData.module, description: permData.description },
      create: permData,
    });
    createdPermissions.push(perm);
  }
  console.log(`✅ Seeded ${createdPermissions.length} permissions.`);

  // 4. Attach ALL permissions to College Admin role using batch createMany
  const collegeAdminRoleId = roleMap.get("college_admin");
  if (!collegeAdminRoleId) {
    throw new Error("College Admin role missing.");
  }

  console.log("Attaching all permissions to College Admin role...");
  const rolePermissionRecords = createdPermissions.map((perm) => ({
    roleId: collegeAdminRoleId,
    permissionId: perm.id,
  }));

  await prisma.rolePermission.createMany({
    data: rolePermissionRecords,
    skipDuplicates: true,
  });
  console.log(`✅ Attached ${createdPermissions.length} permissions to College Admin role.`);

  // 5. Seed Default Admin User
  const adminEmail = "admin@college.edu";
  const adminName = "College Administrator";
  const adminPassword = "Admin@12345";

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    console.log("Creating default College Admin user...");
    const hashedPassword = await hashPassword(adminPassword);

    adminUser = await prisma.user.create({
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
    // Ensure UserRole mapping for College Admin
    await prisma.userRole.upsert({
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

    // Ensure Department scope mapping for College Admin
    const cseDepartment = createdDepartments.find((d) => d.code === "CSE");
    if (cseDepartment) {
      await prisma.userDepartmentScope.upsert({
        where: {
          userId_departmentId: {
            userId: adminUser.id,
            departmentId: cseDepartment.id,
          },
        },
        update: {},
        create: {
          userId: adminUser.id,
          departmentId: cseDepartment.id,
        },
      });
    }

    console.log(`✅ Default College Admin user verified: ${adminEmail} (Role: College Admin, Permissions: All ${createdPermissions.length})`);
  }

  console.log("🎉 Seeding completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error during database seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
