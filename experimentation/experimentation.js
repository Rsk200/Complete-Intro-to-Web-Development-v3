// Function to repeat a character a given number of times
function repeatCharacter(character, timesToRepeat) {
    // We start with an empty string
    let result = "";

    // A loop that runs 'timesToRepeat' times
    for (let i = 0; i < timesToRepeat; i++) {
        // Add the character to our result each time
        result = result + character;
    }

    // Print the final result to the console
    console.log(result);
}

// ---------------------------------------------------------
// Example 1: The example from the prompt
console.log("Repeating 'f' 5 times:");
repeatCharacter('f', 5); // Expected output: fffff

// ---------------------------------------------------------
// Trying a few different combinations:

// Example 2: 'a' and 10
console.log("\nRepeating 'a' 10 times:");
repeatCharacter('a', 10);

// Example 3: 'c' and 100
console.log("\nRepeating 'c' 100 times:");
repeatCharacter('c', 100);

// Example 4: '🐶' and 3
console.log("\nRepeating '🐶' 3 times:");
repeatCharacter('🐶', 3);
