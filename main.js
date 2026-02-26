import { getPageHTML, extractLinksFromHTML, extractTextContentFromHTML } from "./crawler.js";
import { getTextTokens } from "./nlp.js";
import { countTokens } from "./keyword_identifier.js";
import fs from "fs";
const url = "https://link.springer.com/article/10.1007/BF02245786";
const output = await getPageHTML(url);
fs.writeFile("output.html", output, (e) => {
    console.log(e);
});
const content = extractTextContentFromHTML(output);
console.log(content);
const links = extractLinksFromHTML(output, url);
console.log(links);
const tokens = getTextTokens(content);
console.log(getTextTokens(content));
const tokens_count = countTokens(tokens);
console.log("final tokens_count: ", tokens_count);
