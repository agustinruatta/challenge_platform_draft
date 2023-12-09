import { TECH_STACKS } from "./TechStacks";
import SolidityHardhatOutputParser from "./SolidityHardhatOutputParser";
import OutputParser from "./OutputParser";
import CairoOutputParser from "./CairoOutputParser";
import ZigOutputParser from "./ZigOutputParser";

const { exec } = require("child_process");
const fs = require("fs");

export default class TestExecutor {
  //TODO: Maybe this should be in a DB or a config file
  private readonly TECH_STACK_CONFIGS: {
    [key: string]: {
      executionConstraints: {
        /**
         * The amount of seconds that will be the execution limit. If tests take more than this seconds, container
         * is killed.
         */
        timeLimitInSeconds: number;
        /**
         * The amount of MB that can use a container
         */
        memoryLimitInMB: number;
        /**
         * The amount of CPU that can use a container. It can be a float number, like '0.5'
         */
        cpusLimit: number;
      };
      /**
       * Command that is used to execute a specific test file
       */
      testExecutionCommand: string;
      /**
       * Image name that you used it when build it image. By default, use the Dockerfile name, but with snake_case
       * format
       */
      imageName: string;
      /**
       * Complete file path (including its name and extension) within the container where the code provided by the
       * user should be placed. This file is the one that will be evaluated by the tests to verify its correctness
       */
      fileNamePathToTest: string;
      /**
       * Parser that is going to parse the technology test library so we can present that information in a better
       * way to user.
       * This parser should also filter sensitive data
       */
      parser: OutputParser;
      /**
       * String that we need to add at the beginning of user's code. This could be an empty string, or maybe some
       * modules setup (it depends on every technology)
       */
      userSubmittedCodePrefix: string;
      /**
       * This is the amount of exercises for that particular tech stack. We use this in order to map and prevent
       * some vulnerabilities. Exercises test files starts in 'test_ex_1' and ends in 'test_ex_{amountOfExercises}'
       */
      amountOfExercises: number;
    };
  } = {
    solidity: {
      executionConstraints: {
        timeLimitInSeconds: 60,
        memoryLimitInMB: 2048,
        cpusLimit: 2,
      },
      testExecutionCommand: "npx hardhat test test/test_ex_{exerciseId}",
      imageName: "solidity",
      fileNamePathToTest: "/app/argencoin/contracts/CentralBank.sol",
      parser: new SolidityHardhatOutputParser(),
      userSubmittedCodePrefix: "",
      amountOfExercises: 3,
    },
    cairo: {
      executionConstraints: {
        timeLimitInSeconds: 60,
        memoryLimitInMB: 2048,
        cpusLimit: 2,
      },
      testExecutionCommand:
        'echo \\"#[cfg(test)]\\nmod test_ex_{exerciseId};\\n\\" > /app/cairo-exercises/src/tests.cairo && scarb cairo-test -f test_ex_{exerciseId}',
      imageName: "cairo",
      fileNamePathToTest: "/app/cairo-exercises/src/lib.cairo",
      parser: new CairoOutputParser(),
      userSubmittedCodePrefix: "#[cfg(test)]\nmod tests;\n\n",
      amountOfExercises: 2,
    },
    zig: {
      executionConstraints: {
        timeLimitInSeconds: 60,
        memoryLimitInMB: 2048,
        cpusLimit: 2,
      },
      testExecutionCommand:
        "zig test /app/zip-exercises/src/ex_{exerciseId}_test.zig",
      imageName: "zig",
      fileNamePathToTest: "/app/zip-exercises/src/ex_{exerciseId}.zig",
      parser: new ZigOutputParser(),
      userSubmittedCodePrefix: "",
      amountOfExercises: 2,
    },
  };

  async executeTest(
    techStack: TECH_STACKS,
    //This is the code that the user has written, and we need to check if it is OK
    userAssessmentCode: string,
    exerciseId: string
  ) {
    const fileName = this.createTmpFile(techStack, userAssessmentCode);

    const executionInfo = await this.executeDockerCall(
      techStack,
      fileName,
      exerciseId
    );

    this.deleteTmpFile(fileName);

    return {
      successful: executionInfo.exitCode === 0,
      output: this.getParserFromTechStack(techStack).parseOutput(
        executionInfo.exitCode,
        executionInfo.stdout,
        executionInfo.stderr.trim() !== ""
          ? executionInfo.stderr
          : executionInfo.stdout
      ),
    };
  }

  private createTmpFile(
    techStack: TECH_STACKS,
    userAssessmentCode: string
  ): string {
    //Create a random name in order to avoid that different requests could override user codes
    //Use Math.random because it's the fastest, but another method can be used
    //Use Math.floor to remove any point that could cause a file name like "userAssessmentCode456465.6546"
    //Also, with this method, you avoid path traversal vulnerability
    const fileName =
      "userAssessmentCode" +
      Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1));

    const assessmentCodeWithPrefix =
      this.TECH_STACK_CONFIGS[techStack].userSubmittedCodePrefix +
      userAssessmentCode;

    //TODO: in a real environment I'd check if string is too long, raise an error in order to avoid fill disk with crap
    fs.writeFileSync(
      "./user_assessments/" + fileName,
      assessmentCodeWithPrefix
    );

    return fileName;
  }

  private async executeDockerCall(
    techStack: TECH_STACKS,
    userCodeFileName: string,
    exerciseId: string
  ): Promise<{ exitCode: number; stderr: string; stdout: string }> {
    return new Promise((resolve) => {
      /*
            Explanation
            ===========
            Here we're running a container. This is divided in:
            - "timeout -s KILL ": we limit the amount of seconds that a container can take to execute
            - "--rm": we use this to remove container after is executed. This is used to free up disk space
            - "-v $(pwd)/user_assessments/${userCodeFileName}:${this.getFileNamePathToTest(techStack)}": we copy
                the file with user submitted code inside container, in the specific path and file name that is used in the
                repository which contains all the tests
            - ${this.getImageNameFromTechStack(techStack): we get the image name from the tech stack
            - sh -c "${commandToExecuteTests}": execute the code that will run the tests

            Examples of command:
            Solidity: timeout -s KILL 60s docker run --rm -v $(pwd)/user_assessments/userAssessmentCode6381691804325935:/app/argencoin/contracts/CentralBank.sol -m 2048MB --cpus=2 --network none solidity sh -c "npx hardhat test test/test_ex_1"
            Cairo: timeout -s KILL 60s docker run --rm -v $(pwd)/user_assessments/userAssessmentCode6924136168104222:/app/cairo-exercises/src/lib.cairo -m 2048MB --cpus=2 --network none cairo sh -c "echo \"#[cfg(test)]\nmod test_ex_1;\n\" > /app/cairo-exercises/src/tests.cairo && scarb cairo-test -f test_ex_1"
             */
      const command = `${this.getTimeoutLimit(
        techStack
      )} docker run --rm -v $(pwd)/user_assessments/${userCodeFileName}:${this.getFileNamePathToTest(
        techStack,
        exerciseId
      )} ${this.getPerformanceConstraints(
        techStack
      )} ${this.getImageNameFromTechStack(
        techStack
      )} sh -c "${this.getTestsExecutionCommand(techStack, exerciseId)}"`;

      exec(command, (error: any, stdout: string, stderr: string) => {
        const exitCode = error ? error.code : 0;

        resolve({
          exitCode: exitCode,
          stderr: stderr.toString(),
          stdout: stdout.toString(),
        });
      });
    });
  }

  private deleteTmpFile(fileName: string) {
    //Because we generated the file name, it's safe to do it
    fs.unlinkSync("./user_assessments/" + fileName);
  }

  private getTimeoutLimit(techStack: TECH_STACKS): string {
    //@ts-ignore
    return `timeout -s KILL ${Number(
      this.TECH_STACK_CONFIGS[techStack].executionConstraints.timeLimitInSeconds
    )}s`;
  }

  private getPerformanceConstraints(techStack: TECH_STACKS): string {
    /*
        We set here performance constraints:
        -m: This is the max amount of memory that container can use
        --cpus: How many CPU container can take
        --network none: We don't allow any network request

        IMPORTANT: This is very specific for technologies and environment. So play with this values

        More info: https://docs.docker.com/config/containers/resource_constraints/
         */
    return `-m ${this.TECH_STACK_CONFIGS[techStack].executionConstraints.memoryLimitInMB}MB --cpus=${this.TECH_STACK_CONFIGS[techStack].executionConstraints.cpusLimit} --network none`;
  }

  /**
   * Maps the tech stack with the name of the image. This image name comes from the name that you use it when
   * you build it.
   * @param techStack
   */
  private getImageNameFromTechStack(techStack: TECH_STACKS): string {
    return this.TECH_STACK_CONFIGS[techStack].imageName;
  }

  /**
   * We need to create a file with the content that user sent inside container.
   * This function return the file name path inside project structure so it can be executed correctly
   * @param techStack
   */
  private getFileNamePathToTest(
    techStack: TECH_STACKS,
    exerciseId: string
  ): string {
    return this.TECH_STACK_CONFIGS[techStack].fileNamePathToTest.replaceAll(
      "{exerciseId}",
      this.parserIdAsNumber(techStack, exerciseId).toString()
    );
  }

  /**
   * Every tech stack has a different parser. This parser make output prettier, removing things that does not make sense.
   * @param techStack
   */
  private getParserFromTechStack(techStack: TECH_STACKS): OutputParser {
    return this.TECH_STACK_CONFIGS[techStack].parser;
  }

  private getTestsExecutionCommand(
    techStack: TECH_STACKS,
    exerciseId: string
  ): string {
    return this.TECH_STACK_CONFIGS[techStack].testExecutionCommand.replaceAll(
      "{exerciseId}",
      this.parserIdAsNumber(techStack, exerciseId).toString()
    );
  }

  /**
   * We need to parser it but also check that it's a number, in order to prevent path traversal and errors
   * @param techStack
   * @param exerciseId
   */
  private parserIdAsNumber(techStack: TECH_STACKS, exerciseId: string): number {
    if (exerciseId.trim() === "") {
      throw new Error("Invalid exercise ID");
    }

    const number = parseInt(exerciseId, 10);

    if (
      isNaN(number) ||
      number < 1 ||
      number > this.TECH_STACK_CONFIGS[techStack].amountOfExercises
    ) {
      throw new Error("Invalid exercise ID");
    }

    return number;
  }
}
