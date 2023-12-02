const { executeTest, SolidityOutputParser, TECH_STACKS } = require("./TestExecutor");
import { readFileSync } from 'fs';


async function tryThis() {
    console.log('FAILURE EXAMPLE:');
    const failureExecutionResult = await executeTest(
        TECH_STACKS.SOLIDITY,
        'npx hardhat test',
        '',
        new SolidityOutputParser()
    );
    console.log('SUCCESSFUL: ' + failureExecutionResult.successful);
    console.log('OUTPUT:\n' + failureExecutionResult.output);

    console.log('\n\n\n\n');

    console.log('SUCCESS EXAMPLE:');
    const successExecutionResult = await executeTest(
        TECH_STACKS.SOLIDITY,
        'npx hardhat test',
        readFileSync('./CentralBank.sol', 'utf-8'),
        new SolidityOutputParser()
    );
    console.log('SUCCESSFUL: ' + successExecutionResult.successful);
    console.log('OUTPUT:\n' + successExecutionResult.output);
}

tryThis();
