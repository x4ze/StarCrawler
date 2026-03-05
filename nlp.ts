import winkNLP, { ItsFunction, ItemToken, SelectedTokens } from 'wink-nlp';
import model from 'wink-eng-lite-web-model';

const nlp = winkNLP(model);

const { its, as } = nlp;

export function getTextTokens(text: string): string[] {
    const doc = nlp.readDoc(text);

    const tokens = doc.tokens() //Get all text tokens

    //Filter out all stop words, like "the", "is", "at"
    const filteredTokens = tokens.filter(token => !token.out(its.stopWordFlag));

    function ignoreQuotedTokens(token: SelectedTokens): string {
        let token_text = token.out(its.value);
        let inside_quotation = false;
        if (token_text === '"') inside_quotation = !inside_quotation;

        return inside_quotation ? token_text : token.out(its.lemma as ItsFunction<string>);
    }

    //Filter out symbols https://winkjs.org/wink-nlp/part-of-speech.html
    const symbolFilteredTokens = filteredTokens.filter(token => token.out(its.pos) !== "SYM");
    console.log("Tokens with symbols removed: ", symbolFilteredTokens.out(its.value));
    //Lemmatize all words
    const lemmatizedTokens = ignoreQuotedTokens(symbolFilteredTokens);

    //Filter out single character tokens
    const result = lemmatizedTokens.filter(token => token.length > 1);
    return result;
}

export default function lemmatizeAndCleanText(text: string): string {
    const tokens = getTextTokens(text);
    const cleanedText = tokens.join(" ");
    return cleanedText;
}


