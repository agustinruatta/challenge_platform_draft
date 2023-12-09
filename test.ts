import * as readlineSync from 'readline-sync';
import {TECH_STACKS} from "./src/TechStacks";
import TestExecutor from "./src/TestExecutor";

const TEST_DATA = {
    Cairo: {
        stack: TECH_STACKS.CAIRO,
        "Invalid user input": 'This is a random string sent from user',
        "Invalid exercise ID": 'someInvalid../../',
        "Exercise 1": '',
        "Exercise 2": '',
    },
    Solidity: {
        stack: TECH_STACKS.SOLIDITY,
        "Invalid user input": 'This is a random string sent from user',
        "Invalid exercise ID": 'someInvalid../../',
        "Exercise 1": '',
        "Exercise 2": '',
    },
}


function selectTechnology(): string {
    const technologies = ["Cairo", "Solidity"];
    const index = readlineSync.keyInSelect(technologies, 'Select a technology:');
    return technologies[index];
}

function selectTestCase(): string {
    const testCases = [
        "Invalid user input",
        "Invalid exercise ID",
        "Exercise 1",
        "Exercise 2"
    ];
    const index = readlineSync.keyInSelect(testCases, 'Select a test case:');
    return testCases[index];
}

async function main() {
    const selectedTechnology = selectTechnology();
    const selectedTestCase = selectTestCase();

    if (! selectedTechnology || ! selectedTestCase) {
        return;
    }

    const testExecutor = new TestExecutor();
    const start = performance.now();
    const successExecutionResult = await testExecutor.executeTest(
        TEST_DATA[selectedTechnology].stack,
        TEST_DATA[selectedTechnology][selectedTestCase],
        '2',
    );
    const end = performance.now();

    console.log('SUCCESSFUL: ' + successExecutionResult.successful);
    console.log('OUTPUT:\n' + successExecutionResult.output);
    console.log(`EXECUTION TIME: ${end - start} ms.`);
}

main();
