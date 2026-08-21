import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/headers and next/navigation
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

import { getSession, requireAuth } from "./auth.service";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

describe("auth.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSession", () => {
    it("returns active session when auth.api.getSession succeeds", async () => {
      const mockSession = {
        user: {
          id: "user_1",
          email: "test@college.edu",
          name: "Test User",
          emailVerified: false,
        },
        session: {
          id: "sess_1",
          userId: "user_1",
          token: "tok_123",
          expiresAt: new Date(),
        },
      };

      vi.mocked(headers).mockResolvedValue(new Headers());
      vi.mocked(auth.api.getSession).mockResolvedValue(
        mockSession as unknown as Awaited<
          ReturnType<typeof auth.api.getSession>
        >
      );

      const result = await getSession();
      expect(result).toEqual(mockSession);
    });

    it("returns null when auth.api.getSession throws an error", async () => {
      vi.mocked(headers).mockResolvedValue(new Headers());
      vi.mocked(auth.api.getSession).mockRejectedValue(
        new Error("Database offline")
      );

      const result = await getSession();
      expect(result).toBeNull();
    });
  });

  describe("requireAuth", () => {
    it("returns session if user is authenticated", async () => {
      const mockSession = {
        user: {
          id: "user_1",
          email: "test@college.edu",
          name: "Test User",
          emailVerified: false,
        },
        session: {
          id: "sess_1",
          userId: "user_1",
          token: "tok_123",
          expiresAt: new Date(),
        },
      };

      vi.mocked(headers).mockResolvedValue(new Headers());
      vi.mocked(auth.api.getSession).mockResolvedValue(
        mockSession as unknown as Awaited<
          ReturnType<typeof auth.api.getSession>
        >
      );

      const result = await requireAuth();
      expect(result).toEqual(mockSession);
    });

    it("redirects to /login if user is unauthenticated", async () => {
      vi.mocked(headers).mockResolvedValue(new Headers());
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow("NEXT_REDIRECT:/login");
    });

    it("redirects with custom return URL if specified", async () => {
      vi.mocked(headers).mockResolvedValue(new Headers());
      vi.mocked(auth.api.getSession).mockResolvedValue(null);

      await expect(
        requireAuth({ redirectTo: "/admin/settings" })
      ).rejects.toThrow("NEXT_REDIRECT:/login?redirectTo=%2Fadmin%2Fsettings");
    });
  });
});
