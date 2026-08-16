export interface NavItem {
  title: string;
  href: string;
  iconName: string; // Lucide icon name
  requiredPermission?: string; // Optional: if omitted, visible to all authenticated users
  module?: string;
  badge?: string;
}

export const NAVIGATION_CONFIG: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    iconName: "LayoutDashboard",
  },
  {
    title: "Departments",
    href: "/departments",
    iconName: "Building2",
    requiredPermission: "departments.read",
    module: "departments",
  },
  {
    title: "Students",
    href: "/students",
    iconName: "GraduationCap",
    requiredPermission: "students.read",
    module: "students",
  },
  {
    title: "Placement Management",
    href: "/placements",
    iconName: "Briefcase",
    requiredPermission: "placement.read",
    module: "placement",
  },
  {
    title: "TC Management",
    href: "/tc",
    iconName: "FileCheck",
    requiredPermission: "tc.read",
    module: "tc",
  },
  {
    title: "Workflow Engine",
    href: "/workflows",
    iconName: "GitFork",
    requiredPermission: "workflow.manage",
    module: "workflow",
  },
  {
    title: "Dynamic Forms",
    href: "/forms",
    iconName: "FormInput",
    requiredPermission: "forms.manage",
    module: "forms",
  },
  {
    title: "Custom Fields",
    href: "/fields",
    iconName: "Sliders",
    requiredPermission: "fields.manage",
    module: "fields",
  },
  {
    title: "Reports & Analytics",
    href: "/reports",
    iconName: "BarChart3",
    requiredPermission: "reports.read",
    module: "reports",
  },
  {
    title: "Platform Settings",
    href: "/settings",
    iconName: "Settings",
    requiredPermission: "settings.manage",
    module: "settings",
  },
];
