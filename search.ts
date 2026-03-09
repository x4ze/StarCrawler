import { searchDocuments } from "./database.js";
import PromptSync from "prompt-sync";
import lemmatizeAndCleanText from "./nlp.js";
import { SymSpell, Verbosity, loadDefaultDictionaries} from "symspell-ts"

const symSpell = new SymSpell();
loadDefaultDictionaries(symSpell);

const prompt: PromptSync.Prompt = PromptSync({ sigint: true });

//function that spellchecks and switches misspelled words with their correct counterpart.
function spellCheck(query: string): string {
    let insideQuotation = false;
    const tokens = query.split(" ");

    for (let i = 0; i < tokens.length; i++) {
        if (tokens[i][i] === '"') insideQuotation = !insideQuotation;
        if (insideQuotation) {
            insideQuotation = !insideQuotation;
            continue;
        }
        const spellChecked = symSpell.lookup(tokens[i], Verbosity.Top, 2);
        if (spellChecked[0] !== undefined && Number.isNaN(Number(tokens[i]))) {
            tokens[i] = spellChecked[0].term;
        };
    };
    
    const spellCheckedQuery = tokens.join(" ");
    return spellCheckedQuery;
}

export function search(query: string): unknown[] {
    const results = searchDocuments(query);
    return results;
}

while (true) { 
    const query = prompt("Enter search query: ") || "";

    //Spellcheck of user search
    const spellCheckedQuery = spellCheck(query);
    console.log("Spelled query: ", spellCheckedQuery);

    //Cleaning of user search
    const cleanedQuery = lemmatizeAndCleanText(spellCheckedQuery);
    console.log("Cleaned query:", cleanedQuery);


    const results = search(cleanedQuery).slice(0, 4);
    console.log("Search results:", results);
}


