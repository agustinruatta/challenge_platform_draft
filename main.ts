const { executeTest, SolidityOutputParser, TECH_STACKS } = require("./TestExecutor");

async function tryThis() {
    const executionResult = await executeTest(TECH_STACKS.SOLIDITY, 'npx hardhat test', new SolidityOutputParser());
    console.log(executionResult.output);
}

tryThis();
