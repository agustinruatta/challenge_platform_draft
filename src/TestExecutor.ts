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
        const fileName = 'userAssessmentCode' + Math.floor(Math.random() * (Number.MAX_SAFE_INTEGER - 1));

        fs.writeFileSync('./user_assessments/' + fileName, userAssessmentCode);

        return fileName;
    }

    async executeDockerCall(
        techStack: TECH_STACKS,
        commandToExecuteTests: string,
        userCodeFileName: string
    ): Promise<{ exitCode: number, stderr: string, stdout: string }> {
        return (new Promise((resolve) => {
            const command = `docker run --rm ${this.getContainerFromTechStack(techStack)} ${commandToExecuteTests}`;

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
        fs.unlinkSync('./user_assessments/' + fileName);
    }

    getContainerFromTechStack(techStack: TECH_STACKS) {
        const mapping = {
            'solidity': 'solidity',
            //Example of cairo container name
            'cairo': 'cairoContainerV3',
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
