import {TECH_STACKS} from "./TechStacks";
import SolidityHardhatOutputParser from "./SolidityHardhatOutputParser";
import OutputParser from "./OutputParser";

const { exec } = require('child_process');
const fs = require('fs');

export default class TestExecutor {
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
            - "--rm": we use this to remove container after is executed. This is used to free up disk space
            - "-v $(pwd)/user_assessments/${userCodeFileName}:${this.getFileNamePathToTest(techStack)}": we copy
                the file with user submitted code inside container, in the specific path and file name that is used in the
                repository which contains all the tests
            - ${this.getImageNameFromTechStack(techStack): we get the image name from the tech stack
            - sh -c "${commandToExecuteTests}": execute the code that will run the tests

            Example of command:
            docker run --rm -v $(pwd)/user_assessments/userAssessmentCode1419503368532867:/app/argencoin/contracts/CentralBank.sol solidity sh -c "npx hardhat test"
             */
            const command = `docker run --rm -v $(pwd)/user_assessments/${userCodeFileName}:${this.getFileNamePathToTest(techStack)} ${this.getImageNameFromTechStack(techStack)} sh -c "${commandToExecuteTests}"`;

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

    /**
     * Maps the tech stack with the name of the image. This image name comes from the name that you use it when
     * you build it.
     * @param techStack
     */
    getImageNameFromTechStack(techStack: TECH_STACKS) {
        const mapping = {
            'solidity': 'solidity',
            //Example of cairo container name
            'cairo': 'cairoContainerV3',
        }

        return mapping[techStack];
    }

    /**
     * We need to create a file with the content that user sent inside container.
     * This function return the file name path inside project structure so it can be executed correctly
     * @param techStack
     */
    getFileNamePathToTest(techStack: TECH_STACKS): string {
        const mapping = {
            'solidity': '/app/argencoin/contracts/CentralBank.sol',
            //Example of cairo container name
            'cairo': '/add/cairo/file',
        }

        return mapping[techStack];
    }

    /*
    Every tech stack has a different parser. This parser make output prettier, removing things that does not make sense.
     */
    getParserFromTechStack(techStack: TECH_STACKS): OutputParser {
        const mapping = {
            'solidity': new SolidityHardhatOutputParser(),
            //Add Cairo parser
            'cairo': new SolidityHardhatOutputParser(),
        }

        return mapping[techStack];
    }
}
