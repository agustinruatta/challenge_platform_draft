import TestExecutor from "./src/TestExecutor";
import {TECH_STACKS} from "./src/TechStacks";

const userAssessmentCode = `
fn calculate(x: u256, y: u256, operation: felt252)-> u256 {
    if operation == 'add' {
        return x + y;
    } else if operation == 'sub' {
        return x - y;
    } else if operation == 'mul' {
        return x * y;
    } else if operation == 'div' {
        return x / y;
    } else {
        return 0;
    }
}
`

async function tryThis() {
    const testExecutor = new TestExecutor();

    //****Failure: this is because we're just sending a random string
    console.log('FAILURE EXAMPLE:');
    const failureExecutionResult = await testExecutor.executeTest(
        TECH_STACKS.CAIRO,
        'This is a random string sent from user',
        '1'
    );
    console.log('SUCCESSFUL: ' + failureExecutionResult.successful);
    console.log('OUTPUT:\n' + failureExecutionResult.output);

    console.log('\n\n\n\n');

    //*****Success: user sent a correct solution for exercise
    console.log('SUCCESS EXAMPLE:');

    const start = performance.now();
    const successExecutionResult = await testExecutor.executeTest(
        TECH_STACKS.CAIRO,
        userAssessmentCode,
        '2'
    );
    const end = performance.now();

    console.log('SUCCESSFUL: ' + successExecutionResult.successful);
    console.log('OUTPUT:\n' + successExecutionResult.output);
    console.log(`EXECUTION TIME: ${end - start} ms.`);
}

tryThis();
