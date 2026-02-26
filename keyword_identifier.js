export function countTokens(tokens) {
    const counted_tokens = [];
    for (let i = 0; i < tokens.length; i++) {
        let count = 0;
        if (tokens[i] !== "") {
            for (let j = 0; j < tokens.length; j++) {
                if (tokens[j] === tokens[i]) {
                    count++;
                }
            }
            const holder = tokens[i];
            counted_tokens[i] = [count, holder];
            console.log("current_token", holder);
            console.log("counted_tokens: ", counted_tokens);
            //Sätter j till "" för att förhindra duplicates.
            tokens[i] = "";
        }
    }
    return counted_tokens;
}
;
