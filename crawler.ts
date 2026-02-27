import puppeteerExtra from "puppeteer-extra";
const puppeteer = puppeteerExtra.default ?? puppeteerExtra;
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";
import fs from "fs";
import { addToVisitedURLs, addURLArrayToQueue, addURLToQueue, crawling_queue, removeQueueHead, hasVisited, hasVisitedArray } from "./visitorder.js";
import { storeDocument } from "./database.js";
import { get } from "http";

puppeteer.use(StealthPlugin());

export async function getPageHTML(url: string): Promise<string> {
    const browser = await puppeteer.launch({
        headless: true, // or false for debugging
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1024 });

    await page.goto(url, {
        timeout: 10000
    });

    const html = await page.content();
    await browser.close();

    return html;
}

export function extractLinksFromHTML(html: string, url: string): string[] {
    function makeAbsoluteURL(new_URL: string, base_URL: string): string {
        const absolute_URL = new URL(new_URL, base_URL);
        return absolute_URL.toString();
    }   
    const $ = cheerio.load(html);

    const links: string[] = [];

    $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (href)
            try { //Try used to avoid invalid urls that would make makeAbsoluteURL throw an error
                const absolute_URL = makeAbsoluteURL(href, url);
                links.push(absolute_URL);
            } catch (e) {
                //If URL is invalid, skip it
            }
    });

    return links;
}

export function getDocumentTitleFromHTML(html: string): string {
    const $ = cheerio.load(html);
    const title = $("title").text();
    return title;
}

export function extractTextContentFromHTML(html: string): string {
    const $ = cheerio.load(html);

    //Remove non-text elements
    $('script, style, noscript, template, iframe, svg, canvas').remove();

    const text = $('body')
        .text()
        .replace(/\s+/g, ' ') ///Regular expression for any kind of whitespace
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

export async function Crawl(initial_url: string) {
    let iteration = 0;

    addURLToQueue(initial_url);
    let url = removeQueueHead();

    while (url !== null) {
        if(hasVisited(url)) {
            url = removeQueueHead();
            continue;
        } else {
            console.log("iteration:", iteration)
            console.log("URL:", url);

            const pageHTML: string = await visitURL(url);

            const filename: string = "output" + iteration + ".html";
            const path: string = "output/" + filename;
            fs.writeFile(path, pageHTML, (e) => {
                console.log(e);
            });
            
            const content: string = extractTextContentFromHTML(pageHTML);
            //console.log("CONTENT:", content);

            const documentTitle: string = getDocumentTitleFromHTML(pageHTML);

            console.log(`Storing "${documentTitle}" at ${url} in database...`);
            //Insert the newly crawled document into the database
            storeDocument(url, documentTitle, content);
            
            const links: Array<string> = extractLinksFromHTML(pageHTML, url);
            // console.log("LINKS:", links);

            iteration++;
            addURLArrayToQueue(links);
            url = removeQueueHead();
        }
    }
}