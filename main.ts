const { executeTest, SolidityOutputParser, TECH_STACKS } = require("./TestExecutor");
import { readFileSync } from 'fs';


async function tryThis() {
    console.log('FAILURE EXAMPLE:');
    const executionResult = await executeTest(TECH_STACKS.SOLIDITY, 'npx hardhat test', new SolidityOutputParser());
    console.log(executionResult.output);

    console.log('\n\n\n\n');

    console.log('SUCCESS EXAMPLE:');
    const userSolution = readFileSync('./CentralBank.sol', 'utf-8');
    console.log(userSolution);
}

tryThis();
