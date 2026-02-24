import puppeteer from 'puppeteer';
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page.
const browser = await puppeteer.launch();




async function GetPageHTML(url: string) {
    const page = await browser.newPage();
    await page.setViewport({width: 1080, height: 1024});
    await page.goto(url, { waitUntil: 'networkidle0' });//wait until page loads? 

    const html = await page.content();
    return html;
}

await browser.close();