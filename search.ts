import { searchDocuments } from "./database.js";
import PromptSync from "prompt-sync";
import lemmatizeAndCleanText from "./nlp.js";

const prompt: PromptSync.Prompt = PromptSync({ sigint: true });

export function search(query: string): unknown[] {
    const results = searchDocuments(query);
    return results;
}

while (true) { 
    const query = prompt("Enter search query: ") || "";

    //Clean user input query too

    const cleanedQuery = lemmatizeAndCleanText(query);
    console.log("Cleaned query:", cleanedQuery);


    const results = search(cleanedQuery).slice(0, 4);
    console.log("Search results:", results);
}


