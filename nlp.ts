import winkNLP, { ItsFunction, ItemToken, SelectedTokens } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import { SymSpell, Verbosity, loadDefaultDictionaries, SuggestItem } from "symspell-ts"

const nlp = winkNLP(model);

const { its, as } = nlp;

const symSpell = new SymSpell();
loadDefaultDictionaries(symSpell);

export function getTextTokens(text: string): string[] {
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
    console.log("Tokens with symbols removed: ", symbolFilteredTokens.out(its.value));
    //Lemmatize all words

    const lemmatizedTokens = ignoreQuotedTokens(symbolFilteredTokens, its.lemma);
    
    
    //Filter out single character tokens
    const result = lemmatizedTokens.filter(token => token.length > 1);
    return result;
}

function spellCheck(tokens: string[]): string[] {
    for (let i = 0; i < tokens.length; i++) {
        const spellChecked = symSpell.lookup(tokens[i], Verbosity.Top, 2);
        if (spellChecked[0] !== undefined) {
        tokens[i] = spellChecked[0].term;
        }
    }
    return tokens;
}

export default function lemmatizeAndCleanText(text: string): string {
    const tokens = getTextTokens(text);
    console.log("tokens: ", tokens)
    const spellCheckedText = spellCheck(tokens);
    console.log("spellchecked: ", spellCheckedText)
    const cleanedText = spellCheckedText.join(" ");
    console.log("cleanedtext: ", cleanedText)
    return cleanedText;
}


