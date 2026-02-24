import { getPageHTML, extractLinksFromHTML, extractTextContentFromHTML } from "./crawler.js";
import fs from "fs";
const output = await getPageHTML("https://reddit.com");
fs.writeFile("output.html", output, (e) => {
    console.log(e);
});
const content = extractTextContentFromHTML(output);
console.log(content);
const links = extractLinksFromHTML(output);
console.log(links);
