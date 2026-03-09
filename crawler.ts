import puppeteerExtra from "puppeteer-extra";
const puppeteer = puppeteerExtra.default ?? puppeteerExtra;
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { parse } from "node-html-parser";
import fs from "fs";
import { addToVisitedURLs, addURLArrayToQueue, addURLToQueue, crawling_queue, removeQueueHead, hasVisited, hasVisitedArray, writeStartURLs, isFile } from "./visitorder.js";
import { databaseHasStoredUrl, storeDocument } from "./database.js";
import pLimit from "p-limit";
import Bottleneck from "bottleneck";

puppeteer.use(StealthPlugin());
const browser = await puppeteer.launch({
    headless: true,
});

const GLOBAL_CONCURRENCY = 18;
const limit = pLimit(GLOBAL_CONCURRENCY);

const domainLimiters = new Map<string, Bottleneck>();

function getLimiterForHost(host: string) {
    if (!domainLimiters.has(host)) {
        domainLimiters.set(host, new Bottleneck({
            maxConcurrent: 3,   // max 2 parallel per domain
            minTime: 1000        //time between requests, to avoid rate limit
        }));
    }
    return domainLimiters.get(host)!;
}

export async function getPageHTML(url: string): Promise<string> {
    const page = await browser.newPage();


    try {    

        //Disable downloads
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
        if (type === "image" || type === "font" || type === "media") {
            req.abort();
        } else {
            req.continue();
        }
        });

        const response = await page.goto(url, {
            
            //could maybe cause empty docs?!??, but is faster
            waitUntil: "domcontentloaded", 
            timeout: 15000
        });

        if (response && Math.floor((response.status() / 100)) >= 4) {
            //Invalid status code
            console.log("Error status: ", response.status(), url)
            return "error";
        }

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
    if (output_links.length < 3) {
        console.log("!!WARNING, LOW LINK COUNT FOR URL: ", output_links.length, url)
    }
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
        console.log("Error visiting url: ", url)
        return "error";
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
                    console.log("Skipping due to page HTML content error")
                    url = removeQueueHead();
                    return;
                }

                const lang = getLangHeaderFromHTML(pageHTML);
                const isEnglish = lang === "" || /^en/i.test(lang);

                if (!isEnglish) {
                    console.log("Skipping due to not english with lang:", lang);
                    return;
                }

                const filename: string = "output" + iteration + ".html";
                const path: string = "output/" + filename;
                fs.writeFile(path, pageHTML, (e) => {
                    if (e) console.error(e);
                });

                const content: string = extractTextContentFromHTML(pageHTML);

                const documentTitle: string = getDocumentTitleFromHTML(pageHTML);

                
                storeDocument(site_url, documentTitle, content);

                const links: Array<string> = extractLinksFromHTML(pageHTML, site_url);

                iteration++;
                
                //Limit link count per website to make serach more even and broad
                const MAX_LINKS_PER_WEBSITE = 100;

                addURLArrayToQueue(links.slice(0, MAX_LINKS_PER_WEBSITE));

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

