import winkNLP, { ItsFunction, SelectedTokens } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { SymSpell, Verbosity, loadDefaultDictionaries} from "symspell-ts"

const symSpell = new SymSpell();
loadDefaultDictionaries(symSpell);


const nlp = winkNLP(model);

const { its, as } = nlp;

/**
 * Spellchecks and switches potentially misspelled words in a string 
 * with their correct counterpart unless they are wrapped in quotation marks "".
 * @param query {string} The query to spellcheck and change
 * @returns {string} the spellchecked and corrected query as a string, keeping any quotation marks
 */
export function spellCheck(query: string): string {
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

/**
 * Takes a string and returns a cleaned version of the string, where 
 * all words are lemmatized unless they are within quotation marks "",
 * and irrelevant stop words (such as a, the, and etc.) and symbols are removed entirely.
 * @param text {string} The text to lemmatize and clean as a string
 * @returns The original text as a string but lemmatized and without stop words and symbols.
 */
export function lemmatizeAndCleanText(text: string): string {
    const doc = nlp.readDoc(text);

    const tokens = doc.tokens() //Get all text tokens

    //Function that filters tokens a specified way, ignoring tokens inside quotation.
    function ignoreQuotedTokens(token: SelectedTokens, func: Function): string[] {
        const token_array = token.out(its.value);
        const operated_tokens = token.out(func as ItsFunction<string>);
        let insideQuotation = false;
        for (let i = 0; i < token_array.length; i++) {
            if (token_array[i] === '"') insideQuotation = !insideQuotation;
            if (insideQuotation) operated_tokens[i] = token_array[i];
        }
        return operated_tokens;
    }

    //Filter out all stop words, like "the", "is", "at"
    const filteredTokens = tokens.filter(token => !token.out(its.stopWordFlag));

    //Filter out symbols https://winkjs.org/wink-nlp/part-of-speech.html
    const symbolFilteredTokens = filteredTokens.filter(token => token.out(its.pos) !== "SYM");

    //Lemmatize all words, excluding in quotation
    const lemmatizedTokens = ignoreQuotedTokens(symbolFilteredTokens, its.lemma);

    //Filter out single character tokens
    const result = lemmatizedTokens.filter(token => token !== '"');
    const cleanedText = result.join(" ");
    return cleanedText;
}


