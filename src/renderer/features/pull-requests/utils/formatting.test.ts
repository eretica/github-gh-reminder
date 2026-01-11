import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime } from "./formatting";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return "just now" for very recent dates', () => {
    const now = new Date("2024-01-01T12:00:00Z");
    vi.setSystemTime(now);

    const dateString = new Date("2024-01-01T11:59:30Z").toISOString();
    expect(formatRelativeTime(dateString)).toBe("just now");
  });

  it("should return minutes ago for recent dates", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    vi.setSystemTime(now);

    const dateString = new Date("2024-01-01T11:45:00Z").toISOString();
    expect(formatRelativeTime(dateString)).toBe("15 min ago");
  });

  it("should return hours ago for dates within 24 hours", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    vi.setSystemTime(now);

    const dateString = new Date("2024-01-01T09:00:00Z").toISOString();
    expect(formatRelativeTime(dateString)).toBe("3 hours ago");
  });

  it("should return singular hour for 1 hour ago", () => {
    const now = new Date("2024-01-01T12:00:00Z");
    vi.setSystemTime(now);

    const dateString = new Date("2024-01-01T11:00:00Z").toISOString();
    expect(formatRelativeTime(dateString)).toBe("1 hour ago");
  });

  it("should return days ago for dates within a week", () => {
    const now = new Date("2024-01-05T12:00:00Z");
    vi.setSystemTime(now);

    const dateString = new Date("2024-01-02T12:00:00Z").toISOString();
    expect(formatRelativeTime(dateString)).toBe("3 days ago");
  });

  it("should return singular day for 1 day ago", () => {
    const now = new Date("2024-01-02T12:00:00Z");
    vi.setSystemTime(now);

    const dateString = new Date("2024-01-01T12:00:00Z").toISOString();
    expect(formatRelativeTime(dateString)).toBe("1 day ago");
  });

  it("should return localized date for dates older than a week", () => {
    const now = new Date("2024-01-15T12:00:00Z");
    vi.setSystemTime(now);

    const date = new Date("2024-01-01T12:00:00Z");
    const dateString = date.toISOString();
    expect(formatRelativeTime(dateString)).toBe(date.toLocaleDateString());
  });
});
