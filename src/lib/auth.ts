import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/server/database";
import { env } from "@/config/env";

export const auth = betterAuth({
  baseURL: env.APP_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
});

export type AuthSession = typeof auth.$Infer.Session;
