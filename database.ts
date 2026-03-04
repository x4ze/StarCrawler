import Database from "better-sqlite3";
import lemmatizeAndCleanText from "./nlp.js";
import { simplifyURL } from "./visitorder.js";

const db = new Database("database/database.db");

// Enable WAL mode that supposedly increases performance
db.pragma("journal_mode = WAL");


db.exec(`
    CREATE TABLE IF NOT EXISTS raw_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE,
        html_content TEXT,
        crawl_date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);


db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS search_table USING fts5(
        title,
        cleaned_content,
        url UNINDEXED,
        doc_id UNINDEXED
    );
`);

console.log("Database tables created if they didn't already exist.");

export default db;


export function databaseHasStoredUrl(url: string) {
    const simplifiedURL = simplifyURL(url);

    const query_string = `
        SELECT * FROM raw_documents WHERE url = ?;
    `

    const query = db.prepare(query_string);

    const matchingRows = query.all(simplifiedURL);

    return matchingRows.length !== 0;
}

export function storeDocument(url: string, title: string, htmlContent: string) {
    url = simplifyURL(url);

    const raw_documents_insert = db.prepare(`
        INSERT INTO raw_documents (url, html_content) VALUES (?, ?);
    `);
    const documentInsert = raw_documents_insert.run(url, htmlContent);

    const search_table_insert = db.prepare(`
        INSERT INTO search_table (title, cleaned_content, url, doc_id) VALUES (?, ?, ?, ?);
    `);

    const cleanedContent = lemmatizeAndCleanText(htmlContent);

    search_table_insert.run(title, cleanedContent, url, documentInsert.lastInsertRowid);
}

export function searchDocuments(query: string): unknown[] {
    const search_query = db.prepare(`
        SELECT  url, 
                title, 
                snippet(search_table, 1, '<b>', '</b>', '...', 15) AS snippet,
                bm25(search_table) AS score
        FROM search_table
        WHERE search_table MATCH ?
        ORDER BY score
        LIMIT 100; 
    `); 
    //snippet is a built in sqlite3 func that returns the matched 
    //content wrapped in <b> tags here, at a length of 15 words.
    
    const results = search_query.all(query);
    return results; 
}