export default interface OutputParser {
    parseOutput(exitCode: number, stdout: string, stderr: string) : string;
}
