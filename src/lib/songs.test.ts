import { describe, expect, it } from "vitest";
import type { SongGroup } from "./data/songs";
import { parseHymnList, sortQueue } from "./songs";

const group = (number: number, count: number, firstAt: string): SongGroup => ({
  hymnalId: null,
  number,
  title: null,
  status: "requested",
  count,
  ids: [String(number)],
  firstAt,
  requesters: null,
});

describe("sortQueue", () => {
  const a = group(1, 1, "2026-10-24T08:00:00Z");
  const b = group(2, 3, "2026-10-24T08:05:00Z");
  const c = group(3, 3, "2026-10-24T08:01:00Z");

  it("keeps the order received", () => {
    expect(sortQueue([b, c, a], "received").map((g) => g.number)).toEqual([1, 3, 2]);
  });

  it("puts the most requested first, then the earliest", () => {
    expect(sortQueue([a, b, c], "popular").map((g) => g.number)).toEqual([3, 2, 1]);
  });
});

describe("parseHymnList", () => {
  it("reads the usual ways of writing a list", () => {
    const { hymns, skipped } = parseHymnList(
      "1 Praise to the Lord\n2. Holy, Holy, Holy\n3 - Come, Thou Almighty King\n4\tAll Hail the Power\n\n10) Abide With Me",
    );
    expect(hymns).toEqual([
      [1, "Praise to the Lord"],
      [2, "Holy, Holy, Holy"],
      [3, "Come, Thou Almighty King"],
      [4, "All Hail the Power"],
      [10, "Abide With Me"],
    ]);
    expect(skipped).toBe(0);
  });

  it("skips lines without a number or title and keeps the last title per number", () => {
    const { hymns, skipped } = parseHymnList("Hymns\n12\n0 Zero\n2001 Too big\n5 First\n5 Second");
    expect(hymns).toEqual([[5, "Second"]]);
    expect(skipped).toBe(4);
  });

  it("does not split a title that starts with a number", () => {
    expect(parseHymnList("100 10,000 Reasons").hymns).toEqual([[100, "10,000 Reasons"]]);
  });
});
