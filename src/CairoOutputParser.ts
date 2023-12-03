import OutputParser from "./OutputParser";

export default class CairoOutputParser implements OutputParser {
    parseOutput(exitCode: number, stdout: string, stderr: string): string {
        return "PARSING CAIRO";
    }

}
