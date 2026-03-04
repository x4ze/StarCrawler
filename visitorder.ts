import { Queue, Stack } from "@typinghare/stack-queue";
import fs from "fs";

export const crawling_queue: Queue<string> = new Queue;

// Key: URL | Value: nothing for now
const visited_urls: Map<string, number> = new Map<string, number>;

/**
 * Adds a URL to the crawler's visiting queue.
 * @param url a URL as a string
 */
export function addURLToQueue(input_url: string): void {
    const simple_url = simplifyURL(input_url);
    const url = new URL(simple_url);


    const queue_not_full = crawling_queue.size() < 5000;

    //Only add URL to queue if it is http or https, 
    //This is in order to avoid protocols such as mailto:
    if (url.protocol === "http:" || url.protocol === "https:" && queue_not_full && !hasVisited(input_url)) {
        crawling_queue.enqueue(simple_url);
    }
}

/**
 * Adds an array of URLs to the crawler's visiting queue.
 * @param url_array an Array of URLs as strings
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
 * @returns URL in head of queue as string OR null if queue is empty
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
 * @param url a URL as a string
 * @returns boolean representing if url has already been visited by crawler
 */
export function hasVisited(url: string): boolean {
    const simplified_url: string = simplifyURL(url);
    return visited_urls.has(simplified_url);
}

/**
 * Checks for every URL in an Array if URL has previously been visited.
 * @param url_array an Array of URLs as strings
 * @returns Array of booleans representing if url at corresponding index already
 * has been visited by crawler
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
 * @param url a URL as a string
 */
export function addToVisitedURLs(url: string): void {
    const time = Date.now();
    url = simplifyURL(url);
    visited_urls.set(url, time);
}

/**
 * 
 * @param url a URL as a string
 * @returns the URL "simplified" such that URLs that are guaranteed or likely to
 * lead to same page can be identified with same string
 */
export function simplifyURL(url_string: string): string {
    const url = new URL(url_string);
    url_string = url.protocol + "//" + url.host + url.pathname;
    while (url_string.endsWith("/")) {
        url_string = url_string.slice(0, url_string.length - 1);
    }
    return url_string;
}

export function getStartURLs() {
    const content = fs.readFileSync("startURLs.txt", "utf-8");
    const URLs = content.split("\n").filter(url => url.length > 0);
    console.log("the urls: ", URLs);
    return URLs;
}


export function writeStartURLs() {

    // Copy without destroying original
    const cloneArray = [...crawling_queue];
    const tempQueue = new Queue<string>(cloneArray);

    let writeString = "";

    while (!tempQueue.empty()) {
        writeString += tempQueue.dequeue() + "\n";
    }

    fs.writeFile("startURLs.txt", writeString, (e) => {
        if (e) {
            console.error("FAILED TO WRITE startURLs.txt", e);
        }
    });
}

// seems to work
function testHistory(): void {
    const new_url1 = "http://www.geekcraft.lol";
    const new_url2 = "https://www.geekcraft.lol/";
    const new_url3 = "http:www.geekcraft.lol/#";

    console.log("Visited URLs:", visited_urls);
    console.log("Is URL", new_url1, "present in visited URLs?", hasVisited(new_url1));
    console.log("adding new URL to history:", new_url1);
    addToVisitedURLs(new_url1);
    console.log("New visited URLs:", visited_urls);
    console.log("Is URL", new_url1, "present in visited URLs?", hasVisited(new_url1));

    console.log("Is URL", new_url2, "present in visited URLs?", hasVisited(new_url2));
    console.log("Is URL", new_url3, "present in visited URLs?", hasVisited(new_url3));
}