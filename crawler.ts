import puppeteer from 'puppeteer';





export async function GetPageHTML(url: string) {
    // Launch the browser and open a new blank page.
    const browser = await puppeteer.launch();   
    const page = await browser.newPage();
    await page.setViewport({width: 1080, height: 1024});
    await page.goto(url, { waitUntil: 'networkidle0' });//wait until page loads? 

    const html = await page.content();
    await browser.close();
    return html;
}
