import winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
const nlp = winkNLP(model);
const { its, as } = nlp;
export function getTextTokens(text) {
    const doc = nlp.readDoc(text);
    const tokens = doc.tokens(); //Get all text tokens
    //Filter out all stop words, like "the", "is", "at"
    const filteredTokens = tokens.filter(token => !token.out(its.stopWordFlag));
    //Filter out symbols https://winkjs.org/wink-nlp/part-of-speech.html
    const symbolFilteredTokens = filteredTokens.filter(token => token.out(its.pos) !== "SYM");
    //Lemmatize all words
    const lemmatizedTokens = symbolFilteredTokens.out(its.lemma);
    //Filter out single character tokens
    const result = lemmatizedTokens.filter(token => token.length > 1);
    return result;
}
