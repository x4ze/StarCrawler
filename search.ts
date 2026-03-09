import { searchDocuments } from "./database.js";
import PromptSync from "prompt-sync";
import lemmatizeAndCleanText from "./nlp.js";
import { SymSpell, Verbosity, loadDefaultDictionaries} from "symspell-ts"

const symSpell = new SymSpell();
loadDefaultDictionaries(symSpell);

const prompt: PromptSync.Prompt = PromptSync({ sigint: true });

/**
 * Spellchecks and switches potentially misspelled words in a string 
 * with their correct counterpart unless they are wrapped in quotation marks "".
 * @returns the spellchecked and corrected query as a string, keeping any quotation marks
 */
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


