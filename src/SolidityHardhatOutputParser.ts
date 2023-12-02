import OutputParser from "./OutputParser";

export default class SolidityHardhatOutputParser implements OutputParser {
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
