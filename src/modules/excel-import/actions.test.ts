import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import { inspectExcelFileAction, parseExcelFileAction } from "./actions";

vi.mock("@/server/services/auth.service", () => ({
  getSession: vi.fn(),
}));

import { getSession } from "@/server/services/auth.service";

function createMockExcelFile(
  name = "test.xlsx",
  data: unknown[][] = [
    ["ID", "Name", "Email"],
    ["1", "Alice", "alice@example.com"],
  ]
): File {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([buffer], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

describe("Excel Import Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("inspectExcelFileAction", () => {
    it("returns unauthorized error if user is not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const formData = new FormData();
      formData.append("file", createMockExcelFile());

      const result = await inspectExcelFileAction(formData);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
      expect(result.error).toContain("Authentication required");
    });

    it("returns validation error if no file is provided", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "u1", email: "admin@college.edu", name: "Admin" },
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      const formData = new FormData();
      const result = await inspectExcelFileAction(formData);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(result.error).toContain("No valid file provided");
    });

    it("successfully inspects workbook when authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "u1", email: "admin@college.edu", name: "Admin" },
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      const formData = new FormData();
      formData.append("file", createMockExcelFile("roster.xlsx"));

      const result = await inspectExcelFileAction(formData);
      expect(result.success).toBe(true);
      expect(result.data?.totalSheets).toBe(1);
      expect(result.data?.sheetNames).toEqual(["Sheet1"]);
      expect(result.data?.sheets[0].rowCount).toBe(2);
      expect(result.data?.sheets[0].columnCount).toBe(3);
    });
  });

  describe("parseExcelFileAction", () => {
    it("returns unauthorized error if user is not authenticated", async () => {
      vi.mocked(getSession).mockResolvedValue(null);
      const formData = new FormData();
      formData.append("file", createMockExcelFile());

      const result = await parseExcelFileAction(formData);
      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(401);
    });

    it("successfully parses spreadsheet and returns structured headers and rows", async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: "u1", email: "admin@college.edu", name: "Admin" },
        session: {
          id: "s1",
          userId: "u1",
          token: "tok",
          expiresAt: new Date(),
        },
      } as unknown as Awaited<ReturnType<typeof getSession>>);

      const formData = new FormData();
      formData.append(
        "file",
        createMockExcelFile("dataset.xlsx", [
          ["ID Code", "Full Name", "Date Joined"],
          ["EMP01", "Jane Doe", "2024-01-10"],
          ["EMP02", "John Smith", "2024-02-15"],
        ])
      );

      const result = await parseExcelFileAction(formData);
      expect(result.success).toBe(true);
      expect(result.data?.totalRows).toBe(2);
      expect(result.data?.headers.map((h) => h.key)).toEqual([
        "id_code",
        "full_name",
        "date_joined",
      ]);
      expect(result.data?.rows[0]).toEqual({
        __rowNumber: 2,
        id_code: "EMP01",
        full_name: "Jane Doe",
        date_joined: "2024-01-10",
      });
    });
  });
});
