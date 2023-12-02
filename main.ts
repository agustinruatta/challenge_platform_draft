const { executeTest, SolidityOutputParser, TECH_STACKS } = require("./TestExecutor");

async function tryThis() {
    console.log(await executeTest(TECH_STACKS.SOLIDITY, 'npx hardhat test', new SolidityOutputParser()));
}

tryThis();
