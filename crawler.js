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
export function extractLinksFromHTML(html) {
    const $ = cheerio.load(html);
    const links = [];
    $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (href)
            links.push(href);
    });
    return links;
}
