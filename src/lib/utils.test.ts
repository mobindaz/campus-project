import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("combines class names correctly", () => {
    expect(cn("bg-red-500", "text-white")).toBe("bg-red-500 text-white");
  });

  it("handles conditional classes", () => {
    expect(cn("base-class", false && "hidden", true && "visible")).toBe(
      "base-class visible"
    );
  });

  it("merges tailwind conflict classes properly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
