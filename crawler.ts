import puppeteerExtra from "puppeteer-extra";
const puppeteer = puppeteerExtra.default ?? puppeteerExtra;
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { parse } from "node-html-parser";
import { addToVisitedURLs, addURLArrayToQueue, addURLToQueue, removeQueueHead, hasVisited, hasVisitedArray, writeStartURLs, isFile } from "./visitorder.js";
import { databaseHasStoredUrl, storeDocument } from "./database.js";
import pLimit from "p-limit";
import Bottleneck from "bottleneck";

puppeteer.use(StealthPlugin());
export const browser = await puppeteer.launch({
    headless: true,
});

const GLOBAL_CONCURRENCY = 20;
const limit = pLimit(GLOBAL_CONCURRENCY);

const domainLimiters = new Map<string, Bottleneck>();


/**
 * Returns a unique, new or already existing, Bottleneck instance associated with each 
 * domain which can be used to limit the maximum concurrent requests to that host.
 * @param host {string} The domain in question, eg. example.com
 * @returns {Bottleneck} A unique bottleneck used for that domain.
 */
function getLimiterForHost(host: string): Bottleneck {
    if (!domainLimiters.has(host)) {
        domainLimiters.set(host, new Bottleneck({
            maxConcurrent: 2,   // max 2 parallel per domain
            minTime: 1500        //time between requests, to avoid rate limit
        }));
    }
    return domainLimiters.get(host)!;
}


/**
 * Visits a web URL using puppeteer with stealth mode and tries to return
 * the raw HTML content at that URL.
 * @param url {string} The url to visit and gather html content from
 * @returns {string} The HTML content of the website or 'error' in case of http errors.
 */
export async function getPageHTML(url: string): Promise<string> {
    const page = await browser.newPage();
    try {    

        //Try to disallow downloads
        const client = await page.createCDPSession();
        await client.send("Browser.setDownloadBehavior", {
            behavior: "deny",
            eventsEnabled: false
        });


        //DISABLES loading images, fonts and media to save time
        //(I hope this wont cause bot detection?)
        await page.setRequestInterception(true);

        page.on("request", (req) => {
        const type = req.resourceType();
        if (type === "image" || type === "font" || type === "media" || "stylesheet") {
            req.abort();
        } else {
            req.continue();
        }
        });

        const response = await page.goto(url, {
            waitUntil: "domcontentloaded", //could maybe cause empty docs?!??, but is faster
            timeout: 15000
        });

        if (response && Math.floor((response.status() / 100)) >= 4) {
            //Invalid status code
            console.log("Error status: ", response.status(), url)
            return "error";
        }

        return await page.content();
    } catch(e) {
        return "error";
    } finally {
        await page.close();
    }
}


/**
 * Tries to extract all links referenced in 'a' tags in the html of a 
 * @param html {string} The raw HTML to be analyzed 
 * @returns {string} The html language header or an empty string if not found
 */
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
    if (output_links.length < 3) {
        console.log("!!WARNING, LOW LINK COUNT FOR URL: ", output_links.length, url)
    }
    return output_links;
}

/**
 * Tries to get the HTML document title of an HTML string found in the 'title' element.
 * @param html {string} The raw HTML to be analyzed 
 * @returns {string} The html document title or an empty string if not found
 */
export function getDocumentTitleFromHTML(html: string): string {
    const root = parse(html);
    const title = root.querySelector("title")
    return title?.textContent || "";
}

/**
 * Tries to get the HTML language header of an html string found 
 * in the 'lang' attribute of the 'html' element. Eg. en-US
 * @param html {string} The raw HTML to be analyzed 
 * @returns {string} The html language header or an empty string if not found
 */
export function getLangHeaderFromHTML(html: string): string {
    const root = parse(html);
    const htmlElement = root.querySelector("html");
    const lang = htmlElement?.getAttribute("lang");
    return lang ?? "";

}

/**
 * Finds all relevant raw text content in the body of an HTML string and returns it 
 * @param html {string} The raw HTML file content to extract text from
 * @returns {string} The raw text content in the body of the input HTML string.
 */
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
 * history regardless of whether the visit is successful or not!)
 * @param url {string} a web URL 
 * @returns {string} the page HTML content or "error" if the page visit failed 
 */
export async function visitURL(url: string): Promise<string> {
    addToVisitedURLs(url);
    try {
        const content = await getPageHTML(url);
        return content;
    } catch (error) {
        console.log("Error visiting url: ", url)
        return "error";
    }
}


/**
 * The main crawler execution loop that initiates a crawl.
 * The crawler retrieves the topmost URL in the crawling_queue Queue and concurrently processes 
 * at most GLOBAL_CONCURRENCY requests at the same time according to the plimit limiter. 
 * The main steps performed for each crawled url are:
 *  1. Checking whether the URL has already been visited
 *  2. Fetching the page HTML
 *  3. Verifying the page language to avoid processing non-english documents
 *  4. Extract the text content and title of each page
 *  5. Store the document in the database
 *  6. Extract all links from each page
 *  7. Lastly, enqueue 20 random links in order to let the loop continue
 * @param initial_url {string | undefined} An optional starting URL for the crawl
 */
export async function Crawl(initial_url?: string) {
    let iteration = 0;
    const tasks: Promise<void>[] = [];

    if (initial_url !== undefined) addURLToQueue(initial_url);

    let url = removeQueueHead();
  
    async function crawlSite(site_url: string) {
        try {
            const beforeSchedule = Date.now(); 
            const host = new URL(site_url).hostname;
            const limiter = getLimiterForHost(host);
    
            return limiter.schedule(async () => {
                const before = Date.now();
                const waitTime = before - beforeSchedule;
                const pageHTML: string = await visitURL(site_url);

                if (pageHTML === "error") {
                    url = removeQueueHead();
                    return;
                }

                const lang = getLangHeaderFromHTML(pageHTML);
                const isEnglish = lang === "" || /^en/i.test(lang);

                if (!isEnglish) {
                    console.log("Skipping due to not english with lang:", lang);
                    return;
                }

                const content: string = extractTextContentFromHTML(pageHTML);

                const documentTitle: string = getDocumentTitleFromHTML(pageHTML);

                
                storeDocument(site_url, documentTitle, content);

                const links: Array<string> = extractLinksFromHTML(pageHTML, site_url);

                iteration++;
                
                //Limit link count per website to make serach more even and broad
                const MAX_LINKS_PER_WEBSITE = 20;

                //Fetch 20 random links to 
                const linkIndicies = new Set<number>()

                while (linkIndicies.size < MAX_LINKS_PER_WEBSITE  && linkIndicies.size !== links.length) {
                    linkIndicies.add(Math.floor(Math.random() * links.length));
                }                
                const nextLinks: Array<string> = [...linkIndicies].map(i => links[i]);

                addURLArrayToQueue(nextLinks);

                writeStartURLs();

                const after = Date.now();
                console.log(`[Iter ${iteration}] (${after - before} ms) Visited ${site_url} (Waited ${waitTime} ms)`);
            });
        } catch(e) {
            console.log("Invalid URL: ", site_url)
        }
    }

    let activeTasks: number | null = null;
    while (url !== null || (activeTasks === null || activeTasks > 0)) {
        if (url === null || (activeTasks ?? 0) > GLOBAL_CONCURRENCY * 4) {
            //We disallow activetasks to become greater than 4x global_concurrency
            //Otherwise the whole stack will immediately be queued and nothing 
            //will be written to startURLs.txt

            //Sleep for 50ms to wait for more available tasks
            await new Promise(resolve => setTimeout(resolve, 50));
            url = removeQueueHead();
            continue;
        }
        if (hasVisited(url) || databaseHasStoredUrl(url) || url === null || isFile(url)) {
            url = removeQueueHead();
            continue;
        } else {
            const currentUrl = url;
            activeTasks = (activeTasks ?? 0) + 1
            tasks.push(
                limit(() => crawlSite(currentUrl).then(() => {
                    if (activeTasks !== null) activeTasks--
                }))
            );
            
            url = removeQueueHead();
        }
    }

}