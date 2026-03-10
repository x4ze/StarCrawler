import { visitURL, getPageHTML, getLangHeaderFromHTML, getDocumentTitleFromHTML, extractLinksFromHTML } from "./crawler.js";
import { addURLToQueue, crawling_queue, getStartURLs, simplifyURL, writeStartURLs } from "./visitorder.js";
import { searchDocuments } from "./database.js";
import { spellCheck, lemmatizeAndCleanText } from "./nlp.js";

describe('Testing simplified_url', () => {

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

});

test('visiting non existent URL returns "404"', async () => {
  const url_content = await visitURL("https://notarealurl.fake/");
  expect(url_content).toBe("error");
});

describe('Testing search and nlp functions', () => {

  test('No result found for search', ()=> {
    const result = searchDocuments("wawawawgibberishwwrararar").slice(0, 4);
    expect(result).toStrictEqual([]);
  });

  test('Spellcheck replacing misspelled tokens, and ignoring quotation', ()=> {
    const treated_query = spellCheck('tesst "tesst"');
    const treated_result = searchDocuments(treated_query).slice(0, 1);
    // Several checks as null and array also return 'object' from typeof operator.
    const object_check = typeof treated_result[0] === 'object' && treated_result[0] !== null && !Array.isArray(treated_result[0]);
    expect(object_check).toBe(true);
  });

  test('lemmatizeAndCleanText to lemmatize and ignore quotation', ()=> {
    const str = 'running "running"';

    expect(lemmatizeAndCleanText(str)).toBe('run running');
  })

});

describe('getLangHeaderFromHTML, extractLinksFromHTML and getDocumentTitleFromHTML', ()=> {
  
  
  
  test('getLangHeaderFromHTML on websites with english lang. and swedish lang.', async ()=> {
    const en_html = await visitURL("https://en.wikipedia.org/wiki/Main_Page");
    const se_html = await visitURL("https://sv.wikipedia.org/wiki/Portal:Huvudsida");
    const result_html = [getLangHeaderFromHTML(en_html), getLangHeaderFromHTML(se_html)]

    expect(result_html).toStrictEqual(["en", "sv"]);
  });


  test('getDocumentTitleFromHTML on valid URL', async ()=> {
    const html = await visitURL("https://en.wikipedia.org/wiki/Main_Page");

    expect(getDocumentTitleFromHTML(html)).toBe("Wikipedia, the free encyclopedia");
  })

  test('getDocumentTitleFromHTML with no title to find', ()=> {
    expect(getDocumentTitleFromHTML("test")).toBe("");
  })


  test('extract correct links from URL', async ()=> {
    const html = await visitURL("https://example.com/");
    //Only one link on example.com website.
    expect(extractLinksFromHTML(html, "https://example.com/")).toStrictEqual(["https://iana.org/domains/example"]);
  })

});

test('getPageHTML to retrive correct HTML', async ()=> {
  const html = `<!DOCTYPE html><html lang="en"><head><title>Example Domain</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#eee;width:60vw;margin:15vh auto;font-family:system-ui,sans-serif}h1{font-size:1.5em}div{opacity:0.8}a:link,a:visited{color:#348}</style></head><body><div><h1>Example Domain</h1><p>This domain is for use in documentation examples without needing permission. Avoid use in operations.</p><p><a href="https://iana.org/domains/example">Learn more</a></p></div>
</body></html>`;
  expect(await getPageHTML("https://example.com/")).toBe(html);
});

test("Adding URLs to the queue, storing and retrieving from startURLs.txt", async () => {
  addURLToQueue("https://www.typescriptlang.org/")
  addURLToQueue("https://example.com/") //This won't be included, since it was visited earlier
  writeStartURLs();
  expect(getStartURLs()).toStrictEqual(["https://www.typescriptlang.org"]);
})