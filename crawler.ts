import puppeteerExtra from "puppeteer-extra";
const puppeteer = puppeteerExtra.default ?? puppeteerExtra;
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { parse } from "node-html-parser";
import fs from "fs";
import { addToVisitedURLs, addURLArrayToQueue, addURLToQueue, crawling_queue, removeQueueHead, hasVisited, hasVisitedArray, writeStartURLs } from "./visitorder.js";
import { databaseHasStoredUrl, storeDocument } from "./database.js";

puppeteer.use(StealthPlugin());
const browser = await puppeteer.launch({
    headless: false,
});


export async function getPageHTML(url: string): Promise<string> {
    const page = await browser.newPage();

    try {

        //Disable downloads
        await (await page.createCDPSession()).send("Page.setDownloadBehavior", {
            behavior: "deny",
            downloadPath: "/dev/null"
        });


        //DISABLES loading images, fonts and media to save time
        //(I hope this wont cause bot detection?)
        await page.setRequestInterception(true);

        page.on("request", (req) => {
        const type = req.resourceType();
        if (type === "image" || type === "font" || type === "media") {
            req.abort();
        } else {
            req.continue();
        }
        });

        await page.goto(url, {
            /*
            //could maybe cause empty docs?!??, but is faster
            waitUntil: "domcontentloaded", */
            timeout: 10000
        });

        return await page.content();
    } finally {
        await page.close();
    }
}

export function extractLinksFromHTML(html: string, url: string): string[] {
    function makeAbsoluteURL(new_URL: string, base_URL: string): string {
        const absolute_URL = new URL(new_URL, base_URL);
        return absolute_URL.toString();
    }   
    const root = parse(html)

    const output_links: string[] = [];
    const links = root.querySelectorAll("a")

    links.forEach(element => {
        const href = element.getAttribute("href");
        if (href) {
            try { //Try used to avoid invalid urls that would make makeAbsoluteURL throw an error
                const absolute_URL = makeAbsoluteURL(href, url);
                output_links.push(absolute_URL);
            } catch (e) {
                //If URL is invalid, skip it
            }
        }
    });
    return output_links;
}

export function getDocumentTitleFromHTML(html: string): string {
    const root = parse(html);
    const title = root.querySelector("title")
    return title?.textContent || "";
}

export function getLangHeaderFromHTML(html: string): string {
    const root = parse(html);
    const htmlElement = root.querySelector("html");
    const lang = htmlElement?.getAttribute("lang");
    return lang ?? "";

}


export function extractTextContentFromHTML(html: string): string {
    const root = parse(html);

    // Remove non-text elements
    root.querySelectorAll('script, style, noscript, template, iframe, svg, canvas')
        .forEach(el => el.remove());

    const body = root.querySelector('body') ?? root;

    const text = body
        .text
        .replace(/\s+/g, ' ') // Collapse all whitespace
        .trim();

    return text;
}

/**
 * Tries to visit a URL and adds it to crawler's visited history. (Adds to
 * history regardless of if successful!)
 * @param url a URL as a string
 * @returns page HTML content as string (empty string if failed to get content)
 */
export async function visitURL(url: string): Promise<string> {
    addToVisitedURLs(url);
    try {
        const content = await getPageHTML(url);
        return content;
    } catch (error) {
        return "";
    }
}

/**
 * Visits each URL in an Array if it hasn't already been visited, and adds each
 * new visited URL to crawler's history automatically.
 * @param url_array an Array of URLs as strings
 * @returns Array of each visited URLs html content as string (note: input and
 * output indexes will not correspond if any already visisted URLs are present).
 */
export async function visitURLArray(url_array: Array<string>): Promise<Array<string>> {
    const has_visited: Array<boolean> = hasVisitedArray(url_array);
    const result: Array<string> = [];
    for (let index = 0; index < url_array.length; index++) {
        const url: string = url_array[index];
        const has_visited_url: boolean = has_visited[index];
        if (!has_visited_url) {
            const url_content: string = await visitURL(url);
            result.push(url_content);
        } else {}
    }
    return result;
}
export async function Crawl(initial_url?: string) {
    //TODO: check if website is 404 page not found, then dont store it.
    let iteration = 0;

    if (initial_url !== undefined) addURLToQueue(initial_url);

    let url = removeQueueHead();

    while (url !== null) {
        console.time(`Crawler Iteration ${iteration}`); // Start timing the whole iteration
        const before = Date.now(); 

        if (hasVisited(url) || databaseHasStoredUrl(url)) {
            url = removeQueueHead();
            console.timeEnd(`Crawler Iteration ${iteration}`); // End timing if skipped
            continue;
        } else {
            console.log("iteration:", iteration);
            console.log("URL:", url);

            console.time(`visitURL`); // Time the visitURL function
            const pageHTML: string = await visitURL(url);
            console.timeEnd(`visitURL`);

            console.time(`isEnglishCheck`); // Time the English check
            const lang = getLangHeaderFromHTML(pageHTML);
            const isEnglish = lang === "" || /^en/i.test(lang);
            console.timeEnd(`isEnglishCheck`);

            if (!isEnglish) {
                url = removeQueueHead();
                console.timeEnd(`Crawler Iteration ${iteration}`); // End timing if skipped
                console.log("Skipping due to not english with lang:", lang);
                continue;
            }

            console.time(`FileWrite`); // Time the file writing process
            const filename: string = "output" + iteration + ".html";
            const path: string = "output/" + filename;
            fs.writeFile(path, pageHTML, (e) => {
                if (e) console.error(e);
            });
            console.timeEnd(`FileWrite`); // Note: fs.writeFile is async, so this time represents only the start of the write operation. 

            console.time(`extractTextContent`); // Time text extraction
            const content: string = extractTextContentFromHTML(pageHTML);
            console.timeEnd(`extractTextContent`);

            console.time(`getDocumentTitle`); // Time title extraction
            const documentTitle: string = getDocumentTitleFromHTML(pageHTML);
            console.timeEnd(`getDocumentTitle`);

            console.log(`Storing "${documentTitle}" at ${url} in database...`);
            
            console.time(`storeDocument`); // Time database storage
            storeDocument(url, documentTitle, content);
            console.timeEnd(`storeDocument`);

            console.time(`extractLinks`); // Time link extraction
            const links: Array<string> = extractLinksFromHTML(pageHTML, url);
            console.timeEnd(`extractLinks`);

            iteration++;
            
            console.time(`addURLArrayToQueue`); // Time adding links to queue
            addURLArrayToQueue(links);
            console.timeEnd(`addURLArrayToQueue`);

            console.time(`writeStartURLs`); // Time writing URLs to file
            writeStartURLs();
            console.timeEnd(`writeStartURLs`);

            url = removeQueueHead();
        }
        const after = Date.now();
        console.log(`Visited in ${after - before} ms`);
        console.timeEnd(`Crawler Iteration ${iteration - 1}`); // End timing for the completed iteration
    }
}