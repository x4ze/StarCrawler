import { getPageHTML, extractLinksFromHTML } from "./crawler.js"
import fs from "fs";

const url = "https://www.reddit.com/";
const output = await getPageHTML(url);
console.log(output);

fs.writeFile("output.html", output, (e) => {
    console.log(e);
});

const links = extractLinksFromHTML(output, url);
console.log(links);