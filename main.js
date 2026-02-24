import { GetPageHTML } from "./crawler.js";
const output = await GetPageHTML("https://www.google.com/search?q=hej");
console.log(output);
