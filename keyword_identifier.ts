
export function countTokens(tokens: Array<string>) {
    const counted_tokens: Array<[number, string]> = [];
    for(let i = 0; i < tokens.length; i++) {
        let count = 0;
        if (tokens[i] !== "") {
            const holder = tokens[i];
            for(let j = 0; j < tokens.length; j++) {
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
    //Current array contains undefined in spots, this loop creates new array without them.
    const removed_empty_spaces: Array<[number, string]> = [];
    let count = 0;
    for(let a = 0; a < counted_tokens.length; a++) {
        if (counted_tokens[a] !== undefined) {
            removed_empty_spaces[count] = counted_tokens[a];
            count++;
        }
    }
    return removed_empty_spaces;
};

export function topFiveKeywords(tokens: Array<[number, string]>): Array<[number, string]> {
    const test: any = []
    return test;
};