import { generateBlockId } from "./generateBlockId.js";

describe("generateBlockId", () => {
  it("returns a 6-character string", () => {
    const id = generateBlockId();
    expect(id).toHaveLength(6);
  });

  it("contains only lowercase alphanumeric characters", () => {
    const id = generateBlockId();
    expect(id).toMatch(/^[a-z0-9]{6}$/);
  });

  it("generates unique values across 1000 calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      ids.add(generateBlockId());
    }
    expect(ids.size).toBe(1000);
  });
});
