import { get } from "http";
import { getPageHTML, extractLinksFromHTML, extractTextContentFromHTML } from "./crawler.js"
import { getTextTokens } from "./nlp.js";

import fs from "fs";



const url = "https://reddit.com/r/askreddit";
const output = await getPageHTML(url);

fs.writeFile("output.html", output, (e) => {
    console.log(e);
});

const content = extractTextContentFromHTML(output);
console.log(content);

const links = extractLinksFromHTML(output, url);
console.log(links);

console.log(getTextTokens(content));


