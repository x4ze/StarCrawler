import { Queue, Stack } from "@typinghare/stack-queue";
import fs from "fs";

export let crawling_queue: Queue<string> = new Queue;

// Key: URL | Value: nothing for now
const visited_urls: Map<string, number> = new Map<string, number>;

/**
 * Adds a URL to the crawler's visiting queue.
 * @param url {string} a URL as a string
 */
export function addURLToQueue(input_url: string): void {
    const simple_url = simplifyURL(input_url);
    const url = new URL(simple_url);

    const queue_full = crawling_queue.size() >= 10000;

    if (queue_full) {
        //Delete every other element in the queue in order to keep BFS traits.
        
        const queue_clone = new Queue<string>(crawling_queue.elements)
        const n = queue_clone.size();
        for(let i = 0; i < n; i++) {
            const link = queue_clone.dequeue();
            if (i % 2 === 0) {
                //Reinsert every other element
                queue_clone.enqueue(link);
            }
        }

        crawling_queue = queue_clone;
    }

    const queue_url_index = crawling_queue.find(que_url => que_url === simple_url);
    const not_in_que = queue_url_index < 0; //so we dont add the same duplicate urls

    const urlIsFile = isFile(simple_url);

    //Only add URL to queue if it is http or https, 
    //This is in order to avoid protocols such as mailto:
    if ((url.protocol === "http:" || url.protocol === "https:") && not_in_que && !hasVisited(input_url) && !urlIsFile) {
        crawling_queue.enqueue(simple_url);
    }
}

/**
 * Checks if a URL is likely to be the url of a row of example
 * file extensions that aren't interesting to the crawler, such as .png, .jpg and .mp3
 * @param url {string} a web URL
 * @returns {boolean} A bool representing if url includes a generic file type suffix
 */
export function isFile(url: string): boolean {
    const fileRegex = /\.(zip|png|jpg|jpeg|gif|pdf|exe|dmg|mp4|mp3|iso|eps)$/i;
    const urlIsFile = fileRegex.test(url);
    return urlIsFile;
}

/**
 * Adds an array of URLs to the crawler's visiting queue.
 * @param url_array {Array<string>} an Array of web URLs 
 */
export function addURLArrayToQueue(url_array: Array<string>): void {
    for (let index = 0; index < url_array.length; index++) {
        const url: string = url_array[index];
        addURLToQueue(url);
    }
}

/**
 * Returns the first URL in the crawler's visiting queue if there is any AND
 * removes it from the queue.
 * @returns {string | null} URL in head of queue as string OR null if queue is empty
 */
export function removeQueueHead(): string | null {
    if (!crawling_queue.empty()) {
        return crawling_queue.dequeue();
    } else {
        return null;
    }
}

/**
 * Checks if a URL has previously been visited.
 * @param url {string} a web URL
 * @returns boolean representing if url has already been visited by crawler
 */
export function hasVisited(url: string): boolean {
    const simplified_url: string = simplifyURL(url);
    return visited_urls.has(simplified_url);
}

/**
 * Checks for every URL in an Array if URL has previously been visited.
 * @param url_array {Array<string>} an Array of web URLs as strings
 * @returns {Array<boolean>} An array representing if the URL at the
 * corresponding index already has been visited by crawler
 */
export function hasVisitedArray(url_array: Array<string>): Array<boolean> {
    const result: Array<boolean> = [];
    for (let index = 0; index < url_array.length; index++) {
        const url: string = url_array[index];
        const has_visited: boolean = hasVisited(url);
        result.push(has_visited);
    }
    return result;
}

/**
 * Adds a given URL to the crawler's visited URLs history.
 * @param url {string} a web URL
 */
export function addToVisitedURLs(url: string): void {
    const time = Date.now();
    url = simplifyURL(url);
    visited_urls.set(url, time);
}

/**
 * 
 * @param url {string} a web URL
 * @returns {string} the URL "simplified" such that URLs that are guaranteed or likely to
 * lead to same page can be identified with same string
 */
export function simplifyURL(url_string: string): string {
    const url = new URL(url_string);
    // remove queries and hashes from the url.
    url.search = "";
    url.hash = "";

    // turn into lowercase if not already.
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();

    url_string = url.toString();

    //Remove trailing /
    while (url_string.endsWith("/")) {
        url_string = url_string.slice(0, url_string.length - 1);
    }
    return url_string;
}

/**
 * Gets the URLs stored in the startURLs.txt file as an array
 * @returns {Array>string>} array of all urls in the startURLs.txt file as strings
 */
export function getStartURLs(): string[] {
    const content = fs.readFileSync("startURLs.txt", "utf-8");
    const URLs = content.split("\n").filter(url => url.length > 0);
    return URLs;
}

/**
 * Write each url in the current visiting queue (crawling_queue) to a 
 * file named startURLs.txt separated by new lines
 */
export function writeStartURLs(): void {

    // Copy without destroying original
    const cloneArray = crawling_queue.elements;
    const tempQueue = new Queue<string>(cloneArray);

    let writeString = "";

    while (!tempQueue.empty()) {
        writeString += tempQueue.dequeue() + "\n";
    }

    fs.writeFileSync("startURLs.txt", writeString);
}