export function countTokens(tokens) {
    const counted_tokens = [];
    for (let i = 0; i < tokens.length; i++) {
        let count = 0;
        if (tokens[i] !== "") {
            const holder = tokens[i];
            for (let j = 0; j < tokens.length; j++) {
                if (tokens[j] === holder) {
                    count++;
                    //Sätter j till "" för att förhindra duplicates.
                    tokens[j] = "";
                }
            }
            console.log("current state of tokens: ", tokens);
            counted_tokens[i] = [count, holder];
            console.log("current_token", holder);
        }
    }
    const removed_empty_spaces = [];
    let count = 0;
    for (let a = 0; a < counted_tokens.length; a++) {
        if (counted_tokens[a] !== undefined) {
            removed_empty_spaces[count] = counted_tokens[a];
            count++;
        }
    }
    return removed_empty_spaces;
}
;
export function topFiveKeywords(tokens) {
    const test = [];
    return test;
}
;
