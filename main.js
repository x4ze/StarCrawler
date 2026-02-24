import { getPageHTML, extractLinksFromHTML } from "./crawler.js";
import fs from "fs";
const output = await getPageHTML("https://reddit.com");
console.log(output);
fs.writeFile("output.html", output, (e) => {
    console.log(e);
});
const links = extractLinksFromHTML(output);
console.log(links);
