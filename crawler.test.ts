import { visitURL } from "./crawler.js";
import { simplifyURL } from "./visitorder.js";

test('removes trailing slash', () => {
  const simplified_url: string = simplifyURL("https://example.com/");
  expect(simplified_url).toBe("https://example.com");
});

test('URL simplifier removes search property', () => {
  const simplified_url: string = simplifyURL("https://example.com/index?5");
  expect(simplified_url).toBe("https://example.com/index");
});

test('URL simplifier removes hash property', () => {
  const simplified_url: string = simplifyURL("https://example.com/something#example");
  expect(simplified_url).toBe("https://example.com/something");
});

test('URL simplifier removes trailing slash, search and hash property', () => {
  const simplified_url: string = simplifyURL("https://example.com/index?5/something#example/");
  expect(simplified_url).toBe("https://example.com/index");
});

test('visiting non existent URL returns "404"', async () => {
  const url_content = await visitURL("https://notarealurl.fake/");
  expect(url_content).toBe("404");
});