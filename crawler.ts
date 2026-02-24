import puppeteerExtra from "puppeteer-extra";
const puppeteer = puppeteerExtra.default ?? puppeteerExtra;
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as cheerio from "cheerio";

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

export function extractLinksFromHTML(html: string): string[] {
    const page = cheerio.load(html);

    const links: string[] = [];

    page("a").each((_, el) => {
        const href = page(el).attr("href");
        if (href) links.push(href);
    });

    return links;
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

export function Crawl() {

}