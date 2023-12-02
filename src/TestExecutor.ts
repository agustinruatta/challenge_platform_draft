import {TECH_STACKS} from "./TechStacks";
import SolidityHardhatOutputParser from "./SolidityHardhatOutputParser";
import OutputParser from "./OutputParser";

const { exec } = require('child_process');
const fs = require('fs');

export default class TestExecutor {
    //TODO: Maybe this should be in a DB or a config file
    private readonly TECH_STACK_CONFIGS = {
    'solidity': {
        executionConstraints: {
            timeLimitInSeconds: 10,
            memoryLimitInMB: 512,
            cpusLimit: 0.5,
        },
        imageName: 'solidity',
        fileNamePathToTest: '/app/argencoin/contracts/CentralBank.sol',
        parser: new SolidityHardhatOutputParser()
    }
    //Do the same for cairo, same structure
}

    async executeTest(
        techStack: TECH_STACKS,
        //This is the command that we need to execute tests inside container. For example, with solidity using hardhat is "npx hardhat test"
        commandToExecuteTests: string,
        //This is the code that the user has written and we need to check if it is OK
        userAssessmentCode: string,
    ) {
        const fileName = this.createTmpFile(userAssessmentCode);

        const executionInfo = await this.executeDockerCall(techStack, commandToExecuteTests, fileName);

        this.deleteTmpFile(fileName);

        return {
            successful: executionInfo.exitCode === 0,
            output: this.getParserFromTechStack(techStack).parseOutput(
                executionInfo.exitCode,
                executionInfo.stdout,
                executionInfo.stderr.trim() !== '' ? executionInfo.stderr : executionInfo.stdout
            )
        }
    }

    createTmpFile(userAssessmentCode: string): string {
        //Create a random name in order to avoid that different requests could override user codes
        //Use Math.random because it's the fastest, but another method can be used
        //Use Math.floor to remove any point that could cause a file name like "userAssessmentCode456465.6546"
        //Also, with this method, you avoid path traversal vulnerability
        const fileName = 'userAssessmentCode' + Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1));

        //TODO: in a real environment I'd check if string is too long, raise an error in order to avoid fill disk with crap
        fs.writeFileSync('./user_assessments/' + fileName, userAssessmentCode);

        return fileName;
    }

    async executeDockerCall(
        techStack: TECH_STACKS,
        commandToExecuteTests: string,
        userCodeFileName: string
    ): Promise<{ exitCode: number, stderr: string, stdout: string }> {
        return (new Promise((resolve) => {
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

            Example of command:
            docker run --rm -v $(pwd)/user_assessments/userAssessmentCode1419503368532867:/app/argencoin/contracts/CentralBank.sol solidity sh -c "npx hardhat test"
             */
            const command = `${this.getTimeoutLimit(techStack)} docker run --rm -v $(pwd)/user_assessments/${userCodeFileName}:${this.getFileNamePathToTest(techStack)} ${this.getPerformanceConstraints(techStack)} ${this.getImageNameFromTechStack(techStack)} sh -c "${commandToExecuteTests}"`;

            exec(command, (error: any, stdout: string, stderr: string) => {
                const exitCode = error ? error.code : 0;

                resolve({
                    exitCode: exitCode,
                    stderr: stderr.toString(),
                    stdout: stdout.toString(),
                });
            });
        }))
    }

    deleteTmpFile(fileName: string) {
        //Because we generated the file name, it's safe to do it
        fs.unlinkSync('./user_assessments/' + fileName);
    }

    getTimeoutLimit(techStack: TECH_STACKS): string {
        //@ts-ignore
        return `timeout -s KILL ${Number(this.TECH_STACK_CONFIGS[techStack].executionConstraints.timeLimitInSeconds)}s`;
    }

    getPerformanceConstraints(techStack: TECH_STACKS): string {
        /*
        We set here performance constraints:
        -m: This is the max amount of memory that container can use
        --cpus: How many CPU container can take
        --network none: We don't allow any network request

        IMPORTANT: This is very specific for technologies and environment. So play with this values

        More info: https://docs.docker.com/config/containers/resource_constraints/
         */
        //@ts-ignore
        return `-m ${this.TECH_STACK_CONFIGS[techStack].executionConstraints.memoryLimitInMB}MB --cpus=${this.TECH_STACK_CONFIGS[techStack].executionConstraints.cpusLimit} --network none` as string;
    }

    /**
     * Maps the tech stack with the name of the image. This image name comes from the name that you use it when
     * you build it.
     * @param techStack
     */
    getImageNameFromTechStack(techStack: TECH_STACKS): string {
        //@ts-ignore
        return this.TECH_STACK_CONFIGS[techStack].imageName as string;
    }

    /**
     * We need to create a file with the content that user sent inside container.
     * This function return the file name path inside project structure so it can be executed correctly
     * @param techStack
     */
    getFileNamePathToTest(techStack: TECH_STACKS): string {
        //@ts-ignore
        return this.TECH_STACK_CONFIGS[techStack].fileNamePathToTest as string;
    }

    /**
     * Every tech stack has a different parser. This parser make output prettier, removing things that does not make sense.
     * @param techStack
     */
    getParserFromTechStack(techStack: TECH_STACKS): OutputParser {
        //@ts-ignore
        return this.TECH_STACK_CONFIGS[techStack].parser as OutputParser;
    }
}
