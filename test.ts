import * as readlineSync from "readline-sync";
import { TECH_STACKS } from "./src/TechStacks";
import TestExecutor from "./src/TestExecutor";

const TEST_DATA = {
  Zig: {
    stack: TECH_STACKS.ZIG,
    "Invalid exercise ID": "",
    "Invalid user input": "asdf",
    "Exercise 1": `
        // EXERCISE 1

        const std = @import("std");
        
        pub fn printHelloWorld(writer: anytype) !void {
            try writer.print("Hello, world!", .{});
        }
`,
    "Exercise 2": `
    // EXERCISE 2

    const std = @import("std");
    
    pub fn addOne(number: i32) i32 {
        return number + 1;
    }
`,
  },
  Cairo: {
    stack: TECH_STACKS.CAIRO,
    "Invalid exercise ID": "",
    "Invalid user input": "fn exercise_one() -> u16 {",
    "Exercise 1": `
// Exercise 1: Make the mathematical addition work by modifying the code.
fn exercise_one() -> u16 {
    // Only modify the 2 lines below. Don't write any new lines of code.
    let x = 5_u16;
    let y = 300_u16;
    // Don't modify the code below this line.
    let sum: u16 = x + y;
    sum
}
`,
    "Exercise 2": `
// Exercise 2: take the elements representing food from the 'random_elements' tuple and store them in a new tuple variable called 'food'.
fn exercise_two() -> (felt252, felt252) {
    let random_elements = (100, 'sushi', 1, true, 'pizza', 'computer');
    // Write your code below this line. Don't modify the code above this line.
    let (rand1, rand2, rand3, rand4, rand5, rand6) = random_elements;
    let food = (rand2, rand5);
    // Don't modify the code below this line.
    food
}
`,
  },
  Solidity: {
    stack: TECH_STACKS.SOLIDITY,
    "Invalid exercise ID": "",
    "Invalid user input": "This is a random string sent from user",
    "Exercise 1": `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";

contract Testcoin is ERC20, ERC20Burnable, AccessControl, ERC20FlashMint {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Testcoin", "TSTC") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
}
`,
    "Exercise 2": `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RatesOracle.sol";
import "./Argencoin.sol";
import "./Staking.sol";

using SafeERC20 for IERC20;
using SafeERC20 for Argencoin;

/// @custom:security-contact agustinruatta@gmail.com
/// CentralBank has the responsability to mint, burn and has the users' positions.
contract CentralBank is Ownable {
    struct Position {
        uint256 mintedArgcAmount;
        uint256 collateralAmount;
        uint256 liquidationPriceLimit;
    }

    // addres => token => position
    mapping (address => mapping (string => Position)) private positions;

    mapping (string => IERC20) private collateralContracts;

    uint32 private collateralBasicPoints;

    uint32 private liquidationBasicPoints;

    uint16 private mintingFeeBasicPoints;

    Argencoin private immutable argencoinContract;
    RatesOracle private immutable ratesContract;
    mapping(string => Staking) private stakingContracts;

    uint16 private constant ONE_HUNDRED_BASIC_POINTS = 10000;
    uint64 private constant ONE_COLLATERAL_TOKEN_UNIT = 10**18;


    event MintedArgecoins(address minter, uint256 argcAmount, string collateralTokenSymbol, uint256 collateralTokenAmount);
    event BurnedArgecoins(address burner, string collateralTokenSymbol);
    event PositionLiquidated(address liquidator, address positionOwner, string collateralTokenSymbol, uint256 liquidationPriceLimit, uint256 argencoinCollateralRate);

    constructor(
        address ownerAddress,
        address _argencoinAddress,
        address _ratesOracleAddress,
        uint32 _collateralBasicPoints,
        uint32 _liquidationBasicPoints,
        uint16 _mintingFeeBasicPoints
    ) {
        argencoinContract = Argencoin(_argencoinAddress);
        ratesContract = RatesOracle(_ratesOracleAddress);

        setCollateralPercentages(_collateralBasicPoints, _liquidationBasicPoints);
        setMintingFee(_mintingFeeBasicPoints);

        _transferOwnership(ownerAddress);
    }

    /**
     * @param _collateralBasicPoints This percentage indicates how much an user has to deposit in order mint some money. For example, if this param is 15000 (150%)
     *  and user want to mint 200 ARGC, they have to deposit as least 300 ARGC as collateral.
     * @param _liquidationBasicPoints This percentage indicates what is the threshold in which a position can be liquidated. For example, if _collateralBasicPoints
     *  is 20000 (200%), _liquidationBasicPoints is 12500(125%) and stable/ARGC is $400, it means that it can be liquidated when stable/ARGC is less than $250.
     */
    function setCollateralPercentages(uint32 _collateralBasicPoints, uint32 _liquidationBasicPoints) public onlyOwner {
        require(_collateralBasicPoints > _liquidationBasicPoints, "Collateral percentage must be greater than liquidation percentage");
        require(_collateralBasicPoints > 10000 && _liquidationBasicPoints > 10000, "Collateral and liquidation percentages must be greater 100% (10000 basic points)");

        collateralBasicPoints = _collateralBasicPoints;
        liquidationBasicPoints = _liquidationBasicPoints;
    }

    function getCollateralBasicPoints() public view returns (uint32) {
        return collateralBasicPoints;
    }

    function getLiquidationBasicPoints() public view returns (uint32) {
        return liquidationBasicPoints;
    }

    function setMintingFee(uint16 _mintingFeeBasicPoints) public onlyOwner {
        require(_mintingFeeBasicPoints <= ONE_HUNDRED_BASIC_POINTS, "Max minting fee is 10000 basic points");
        mintingFeeBasicPoints = _mintingFeeBasicPoints;
    }

    function getMintingFee() public view returns (uint16) {
        return mintingFeeBasicPoints;
    }

    function getPosition(address userAddress, string memory token) public view returns (Position memory) {
        return positions[userAddress][token];
    }

    function addNewCollateralToken(string memory tokenSymbol, address erc20Contract, address stakingContract) external onlyOwner {
        require(address(collateralContracts[tokenSymbol]) == address(0), "Token is already set. Please, call 'editColleteralToken' function.");

        collateralContracts[tokenSymbol] = IERC20(erc20Contract);
        stakingContracts[tokenSymbol] = Staking(stakingContract);
    }

    function editCollateralToken(string memory tokenSymbol, address erc20Contract, address stakingContract) external onlyOwner {
        require(address(collateralContracts[tokenSymbol]) != address(0), "Token is not set yet. Please, call 'addNewColleteralToken' function.");

        collateralContracts[tokenSymbol] = IERC20(erc20Contract);
        stakingContracts[tokenSymbol] = Staking(stakingContract);
    }

    function getCollateralTokenContract(string memory tokenSymbol) public view returns (IERC20) {
        require(address(collateralContracts[tokenSymbol]) != address(0), "Unkwnown collateral token.");

        return collateralContracts[tokenSymbol];
    }

    function calculateMaxAllowedArgcToMint(uint256 argencoinCollateralRate, uint256 collateralTokenAmount) public view returns (uint256) {
        uint256 feeAmount = (collateralTokenAmount * mintingFeeBasicPoints) / ONE_HUNDRED_BASIC_POINTS;

        return (((collateralTokenAmount - feeAmount) * argencoinCollateralRate * ONE_HUNDRED_BASIC_POINTS) / (getCollateralBasicPoints())) / ONE_COLLATERAL_TOKEN_UNIT;
    }

    function calculateFeeAmount(uint256 argencoinCollateralRate, uint256 argencoinAmount) public view returns (uint256) {
        //Future improvement: make calculus clearer

        uint256 argencoinsAfterFee = (argencoinAmount * ONE_HUNDRED_BASIC_POINTS) / (ONE_HUNDRED_BASIC_POINTS - mintingFeeBasicPoints);
        uint256 afterAppliedCollateral = (argencoinsAfterFee * collateralBasicPoints) / ONE_HUNDRED_BASIC_POINTS;
        uint256 toCollateralRate = (afterAppliedCollateral * ONE_COLLATERAL_TOKEN_UNIT) / argencoinCollateralRate;

        return (toCollateralRate * mintingFeeBasicPoints) / ONE_HUNDRED_BASIC_POINTS;
    }

    function mintArgencoin(uint256 argcAmount, string memory collateralTokenSymbol, uint256 collateralTokenAmount) external {
        require(argcAmount >= ONE_COLLATERAL_TOKEN_UNIT, "You must mint at least 1 Argencoin");
        require(positions[msg.sender][collateralTokenSymbol].mintedArgcAmount == 0, "You have a previous minted position. Burn it.");

        IERC20 collateralContract = getCollateralTokenContract(collateralTokenSymbol);

        uint256 argencoinCollateralRate = ratesContract.getArgencoinRate(collateralTokenSymbol);

        //Check if collateral is enough
        require(calculateMaxAllowedArgcToMint(argencoinCollateralRate, collateralTokenAmount) >= argcAmount, "Not enough collateral");

        //Calculate collateral and fee amounts
        uint256 feeAmount = calculateFeeAmount(argencoinCollateralRate, argcAmount);
        uint256 collateralTokenAmountAfterFee = collateralTokenAmount - feeAmount;

        _transferArgencoinCollateral(collateralContract, collateralTokenAmountAfterFee);
        _transferFeeCollateral(collateralTokenSymbol, collateralContract, feeAmount);

        //Save position
        positions[msg.sender][collateralTokenSymbol] = Position(
            argcAmount,
            collateralTokenAmountAfterFee,
            calculateLiquidationPriceLimit(argcAmount, liquidationBasicPoints, collateralTokenAmountAfterFee)
        );

        //Mint argencoin
        argencoinContract.mint(msg.sender, argcAmount);

        emit MintedArgecoins(msg.sender, argcAmount, collateralTokenSymbol, collateralTokenAmount);
    }

    function _transferArgencoinCollateral(IERC20 collateralContract, uint256 collateralTokenAmountAfterFee) private {
        uint256 centralBankBalanceBeforeTransfer = collateralContract.balanceOf(address(this));

        collateralContract.safeTransferFrom(msg.sender, address(this), collateralTokenAmountAfterFee);

        require(collateralContract.balanceOf(address(this)) == centralBankBalanceBeforeTransfer + collateralTokenAmountAfterFee, "Collateral transfer was not done");
    }

    function _transferFeeCollateral(string memory tokenSymbol, IERC20 collateralContract, uint256 feeAmount) private {
        address stakingContractAddress = address(stakingContracts[tokenSymbol]);

        uint256 stakingBalanceBeforeTransfer = collateralContract.balanceOf(stakingContractAddress);

        collateralContract.safeTransferFrom(msg.sender, stakingContractAddress, feeAmount);

        require(collateralContract.balanceOf(stakingContractAddress) == stakingBalanceBeforeTransfer + feeAmount, "Fee collateral transfer was not done");
    }

    function burnArgencoin(string memory collateralTokenSymbol) external {
        require(positions[msg.sender][collateralTokenSymbol].mintedArgcAmount > 0, "You have not minted Argencoins with sent collateral");

        uint256 mintedArgcAmount = positions[msg.sender][collateralTokenSymbol].mintedArgcAmount;
        uint256 collateralAmount = positions[msg.sender][collateralTokenSymbol].collateralAmount;

        //Remove position
        delete positions[msg.sender][collateralTokenSymbol];

        //Burn Argencoins
        argencoinContract.safeTransferFrom(msg.sender, address(this), mintedArgcAmount);
        argencoinContract.burn(mintedArgcAmount);

        //Return collateral
        IERC20 collateralContract = getCollateralTokenContract(collateralTokenSymbol);
        collateralContract.safeTransfer(msg.sender, collateralAmount);

        emit BurnedArgecoins(msg.sender, collateralTokenSymbol);
    }

    function calculateLiquidationPriceLimit(uint256 mintedArgencoinsAmount, uint256 _liquidationBasicPoints, uint256 collateralTokensAmount) public pure returns (uint256) {
        return (mintedArgencoinsAmount * ONE_COLLATERAL_TOKEN_UNIT * _liquidationBasicPoints) / (collateralTokensAmount * ONE_HUNDRED_BASIC_POINTS);
    }

    function liquidatePosition(address positionOwner, string memory collateralTokenSymbol) external {
        //Check if position exists
        Position memory position = positions[positionOwner][collateralTokenSymbol];
        require(position.mintedArgcAmount > 0, "Position not found");

        //Check if position can be liquidated
        uint256 argencoinCollateralRate = ratesContract.getArgencoinRate(collateralTokenSymbol);
        uint256 liquidationPriceLimit = position.liquidationPriceLimit;
        require(argencoinCollateralRate < liquidationPriceLimit, "Position is not under liquidation value");

        //Delete position
        delete positions[positionOwner][collateralTokenSymbol];

        //Burn argencoins
        argencoinContract.safeTransferFrom(msg.sender, address(this), position.mintedArgcAmount);
        argencoinContract.burn(position.mintedArgcAmount);

        //Give DAI
        getCollateralTokenContract(collateralTokenSymbol).safeTransfer(msg.sender, position.collateralAmount);

        emit PositionLiquidated(msg.sender, positionOwner, collateralTokenSymbol, liquidationPriceLimit, argencoinCollateralRate);
    }
}
`,
  },
};

function selectTechnology(): string {
  const technologies = ["Cairo", "Solidity", "Zig"];
  const index = readlineSync.keyInSelect(technologies, "Select a technology:");
  return technologies[index];
}

function selectTestCase(): string {
  const testCases = [
    "Invalid user input",
    "Invalid exercise ID",
    "Exercise 1",
    "Exercise 2",
  ];
  const index = readlineSync.keyInSelect(testCases, "Select a test case:");
  return testCases[index];
}

async function main() {
  const selectedTechnology = selectTechnology();
  const selectedTestCase = selectTestCase();
  console.log("\n\n");

  const exerciseId = {
    "Invalid exercise ID": "someInvalid../../",
    "Invalid user input": "1",
    "Exercise 1": "1",
    "Exercise 2": "2",
  }[selectedTestCase];

  if (!selectedTechnology || !selectedTestCase || !exerciseId) {
    return;
  }

  const testExecutor = new TestExecutor();

  const start = performance.now();
  let end: number;
  try {
    const successExecutionResult = await testExecutor.executeTest(
      // @ts-ignore
      TEST_DATA[selectedTechnology].stack,
      // @ts-ignore
      TEST_DATA[selectedTechnology][selectedTestCase],
      exerciseId
    );

    end = performance.now();

    console.log("IS SUCCESSFUL: " + successExecutionResult.successful);
    console.log("OUTPUT:\n" + successExecutionResult.output);
  } catch (e) {
    end = performance.now();
    console.log("EXCEPTION THROWN: " + e);
  }

  console.log(`EXECUTION TIME: ${end - start} ms.`);
}

main();
