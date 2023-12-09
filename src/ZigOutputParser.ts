import OutputParser from "./OutputParser";

export default class ZigOutputParser implements OutputParser {
  parseOutput(exitCode: number, stdout: string, stderr: string): string {
    if (stderr.includes("killed") && stderr.includes("timeout -s KILL")) {
      return "TIMEOUT";
    }

    return stdout;
  }
}
