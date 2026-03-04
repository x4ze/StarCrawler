import { Crawl } from "./crawler.js"
import { addURLArrayToQueue, getStartURLs } from "./visitorder.js";

console.log("");
console.log("STAR CRAWLER");
console.log("");

const startURLs = getStartURLs();

addURLArrayToQueue(startURLs);
Crawl();
