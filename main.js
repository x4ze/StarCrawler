import { getPageHTML, extractLinksFromHTML, extractTextContentFromHTML } from "./crawler.js";
import fs from "fs";
<<<<<<< HEAD
const output = await getPageHTML("https://reddit.com");
fs.writeFile("output.html", output, (e) => {
    console.log(e);
});
const content = extractTextContentFromHTML(output);
console.log(content);
const links = extractLinksFromHTML(output);
=======
const url = "https://www.reddit.com/";
const output = await getPageHTML(url);
console.log(output);
fs.writeFile("output.html", output, (e) => {
    console.log(e);
});
const links = extractLinksFromHTML(output, url);
>>>>>>> 557c55758de60c7ce8aed319e8c36ff69bb42916
console.log(links);
