import { simplifyURL } from "./visitorder.js";

test("removes trailing slash", () => {
  expect(simplifyURL("https://example.com/")).toBe("https://example.com");
});