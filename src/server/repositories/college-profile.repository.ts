import { prisma } from "@/server/database";
import { Prisma } from "@prisma/client";

export async function getCollegeProfile() {
  const profile = await prisma.collegeProfile.findFirst();
  if (!profile) {
    // Return default unconfigured profile
    return prisma.collegeProfile.create({
      data: {
        name: "Campus Operations College",
        primaryColor: "#4F46E5",
        secondaryColor: "#06B6D4",
        isConfigured: false,
      },
    });
  }
  return profile;
}

export async function isCollegeConfigured(): Promise<boolean> {
  const profile = await prisma.collegeProfile.findFirst({
    select: { isConfigured: true },
  });
  return profile?.isConfigured ?? false;
}

export async function upsertCollegeProfile(
  data: Prisma.CollegeProfileUpdateInput
) {
  const existing = await prisma.collegeProfile.findFirst();

  if (!existing) {
    return prisma.collegeProfile.create({
      data: {
        name: (data.name as string) || "Campus Operations College",
        logoUrl: (data.logoUrl as string) || null,
        address: (data.address as string) || null,
        city: (data.city as string) || null,
        state: (data.state as string) || null,
        postalCode: (data.postalCode as string) || null,
        country: (data.country as string) || "India",
        contactEmail: (data.contactEmail as string) || null,
        contactPhone: (data.contactPhone as string) || null,
        website: (data.website as string) || null,
        primaryColor: (data.primaryColor as string) || "#4F46E5",
        secondaryColor: (data.secondaryColor as string) || "#06B6D4",
        isConfigured: (data.isConfigured as boolean) ?? false,
      },
    });
  }

  return prisma.collegeProfile.update({
    where: { id: existing.id },
    data,
  });
}

export async function markCollegeConfigured(isConfigured = true) {
  const existing = await getCollegeProfile();
  return prisma.collegeProfile.update({
    where: { id: existing.id },
    data: { isConfigured },
  });
}
