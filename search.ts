import { searchDocuments } from "./database.js";
import PromptSync from "prompt-sync";
import {lemmatizeAndCleanText, spellCheck} from "./nlp.js";

const prompt: PromptSync.Prompt = PromptSync({ sigint: true });


while (true) { 
    const query = prompt("Enter search query: ") || "";

    //Spellcheck of user search
    const spellCheckedQuery = spellCheck(query);
    console.log("Spelled query: ", spellCheckedQuery);

    //Cleaning of user search
    const cleanedQuery = lemmatizeAndCleanText(spellCheckedQuery);
    console.log("Cleaned query:", cleanedQuery);

    if (cleanedQuery.length < 1) {
        console.log("Cleaned query empty, try again.")
        continue;
    }

    const results = searchDocuments(cleanedQuery).slice(0, 4);
    console.log("Search results:", results);
}


