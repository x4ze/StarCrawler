import Database from "better-sqlite3";
import { lemmatizeAndCleanText } from "./nlp.js";
import { simplifyURL } from "./visitorder.js";

const db = new Database("database/database.db");

// Enable WAL mode that supposedly increases performance
db.pragma("journal_mode = WAL");

db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_table USING fts5(
        title,
        cleaned_content,
        url
    );
`);

console.log("Database table created if it didn't already exist.");

export default db;

/**
 * Checks whether a url has already been stored in the SQLite database table search_table
 * @param url {string} The url to check
 * @returns {boolean} A bool representing whether the given url already is stored in the database
 */
export function databaseHasStoredUrl(url: string): boolean {
    const simplifiedURL = simplifyURL(url);

    const query_string = `
        SELECT 1 FROM search_table WHERE url = ? LIMIT 1;
    `

    const query = db.prepare(query_string);

    const matchingRows = query.all(simplifiedURL);

    return matchingRows.length !== 0;
}


/**
 * Inserts a crawled document/website into the SQlite fts5 table search_table
 * @param url {string} The url of the document to insert.
 * @param title {string} The html title of the document to insert
 * @param htmlContent {string} The raw unmodified html content of the document
 */
export function storeDocument(url: string, title: string, htmlContent: string): void {
    try {
        url = simplifyURL(url);

        const search_table_insert = db.prepare(`
            INSERT INTO search_table (title, cleaned_content, url) VALUES (?, ?, ?);
        `);

        const cleanedContent = lemmatizeAndCleanText(htmlContent);

        search_table_insert.run(title, cleanedContent, url);
    } catch(e) {
        console.log("Failed to insert document for url: ", url)
    }
}

//Structure of result returned from the SQLite table search_table
type SearchResult = {
    url: string;
    title: string;
    snippet: string;
    score: number;
};

/**
 * Performs a full text search matching a query in the FTS sqlite table search_table
 * @param query {string} The SQlite FTS compmatible query as 
 * a string that the full text search should match
 * @returns {Array<SearchResult>} array of the top 100 database entries matching the query
 * formatted as records representing search results.
 */
export function searchDocuments(query: string): SearchResult[] {
    const search_query = db.prepare<string, SearchResult>(`
        SELECT  url, 
                title, 
                snippet(search_table, 1, '<b>', '</b>', '...', 15) AS snippet,
                bm25(search_table, 2, 1, 0.1) AS score
        FROM search_table
        WHERE search_table MATCH ?
        ORDER BY score
        LIMIT 100; 
    `); 
    //snippet is a built in sqlite3 func that returns the matched 
    //content wrapped in <b> tags here, at a length of 15 words.

    //2, 1, 0.1 are the different score weights
    //for the columns title, content and url respecitvely
    
    return search_query.all(query);
}