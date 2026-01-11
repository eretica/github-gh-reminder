import { describe, expect, it } from "vitest";
import { CI_STATUS, REVIEW_DECISION } from "./constants";
import { getStatusColor } from "./status";

describe("getStatusColor", () => {
  it("should return green color for SUCCESS status", () => {
    expect(getStatusColor(CI_STATUS.SUCCESS)).toBe("text-green-600");
  });

  it("should return green color for APPROVED status", () => {
    expect(getStatusColor(REVIEW_DECISION.APPROVED)).toBe("text-green-600");
  });

  it("should return red color for FAILURE status", () => {
    expect(getStatusColor(CI_STATUS.FAILURE)).toBe("text-red-600");
  });

  it("should return red color for ERROR status", () => {
    expect(getStatusColor(CI_STATUS.ERROR)).toBe("text-red-600");
  });

  it("should return red color for CHANGES_REQUESTED status", () => {
    expect(getStatusColor(REVIEW_DECISION.CHANGES_REQUESTED)).toBe(
      "text-red-600",
    );
  });

  it("should return yellow color for PENDING status", () => {
    expect(getStatusColor(CI_STATUS.PENDING)).toBe("text-yellow-600");
  });

  it("should return yellow color for REVIEW_REQUIRED status", () => {
    expect(getStatusColor(REVIEW_DECISION.REVIEW_REQUIRED)).toBe(
      "text-yellow-600",
    );
  });

  it("should return gray color for undefined status", () => {
    expect(getStatusColor(undefined)).toBe("text-gray-400");
  });

  it("should return gray color for unknown status", () => {
    expect(getStatusColor("UNKNOWN")).toBe("text-gray-400");
  });

  it("should handle lowercase status strings", () => {
    expect(getStatusColor("success")).toBe("text-green-600");
    expect(getStatusColor("failure")).toBe("text-red-600");
    expect(getStatusColor("pending")).toBe("text-yellow-600");
  });
});
