const { exec } = require('child_process');

export enum TECH_STACKS {
    SOLIDITY = 'solidity',
    CAIRO = 'cairo'
}

interface OutputParser {
    //Parse output so it can be shared to user
    parseOutput(exitCode: number, stdout: string, stderr: string) : string;
}

export class SolidityOutputParser implements OutputParser {
    parseOutput(exitCode: number, stdout: string, stderr: string): string {
        if (exitCode === 0) {
            return this.parseSuccess(stdout);
        } else {
            return this.parseError(stderr);
        }
    }

    parseSuccess(stdout: string): string {
        return stdout.split('\n').filter(line => line.trim() !== '').join('\n');
    }

    parseError(stderr: string): string {
        const lines = stderr.split('\n');

        return lines.filter(line => {
            const trimmedLine = line.trim();

            return (
                trimmedLine !== '' &&
                    ! trimmedLine.includes('passing') &&
                    ! trimmedLine.includes('failing') &&
                    trimmedLine.substring(0, 2) !== 'at'
            )
        }).join('\n')
    }

}

export async function executeTest(
    techStack: TECH_STACKS,
    //This is the command that we need to execute tests inside container. For example, with solidity using hardhat is "npx hardhat test"
    commandToExecuteTests: string,
    //This is the code that the user has wrote and we need to check if it is OK
    userAssessmentCode: string,
    //Every tech stack has a different parser. This parser make output prettier, removing things that does not make sense
    outputParser: OutputParser
) {
    const executionInfo: {exitCode: number, stderr: string, stdout: string} = await (new Promise((resolve) => {
        const command = `docker run --rm ${getContainerFromTechStack(techStack)} ${commandToExecuteTests}`;

        exec(command, (error: any, stdout: string, stderr: string) => {
            const exitCode = error ? error.code : 0;

            resolve({
                exitCode: exitCode,
                stderr: stderr.toString(),
                stdout: stdout.toString(),
            });
        });
    }));

    return {
        successful: executionInfo.exitCode === 0,
        output: outputParser.parseOutput(
            executionInfo.exitCode,
            executionInfo.stdout,
            executionInfo.stderr.trim() !== '' ? executionInfo.stderr : executionInfo.stdout
        )
    }
}

function getContainerFromTechStack(techStack: TECH_STACKS) {
    const mapping = {
        'solidity': 'solidity',
        'cairo': 'cairoContainerV3',
    }

    return mapping[techStack];
}
