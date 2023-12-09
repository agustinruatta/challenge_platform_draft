import OutputParser from "./OutputParser";

export default class CairoOutputParser implements OutputParser {
    parseOutput(exitCode: number, stdout: string, stderr: string): string {
        if (stdout !== '') {
            return stdout;
        } else {
            return stderr;
        }
    }

}
