import puppeteerExtra from "puppeteer-extra";
const puppeteer = puppeteerExtra.default ?? puppeteerExtra;
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";
puppeteer.use(StealthPlugin());
export async function getPageHTML(url) {
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
<<<<<<< HEAD
export function extractLinksFromHTML(html) {
    const page = cheerio.load(html);
=======
export function extractLinksFromHTML(html, url) {
    function makeAbsoluteURL(new_URL, base_URL) {
        const absolute_URL = new URL(new_URL, base_URL);
        return absolute_URL.toString();
    }
    const $ = cheerio.load(html);
>>>>>>> 557c55758de60c7ce8aed319e8c36ff69bb42916
    const links = [];
    page("a").each((_, el) => {
        const href = page(el).attr("href");
        if (href)
            links.push(makeAbsoluteURL(href, url));
    });
    return links;
}
export function extractTextContentFromHTML(html) {
    const $ = cheerio.load(html);
    //Remove non-text elements
    $('script, style, noscript, template, iframe, svg, canvas').remove();
    const text = $('body')
        .text()
        .replace(/\s+/g, ' ')
        .trim();
    return text;
}
export function Crawl() {
}
