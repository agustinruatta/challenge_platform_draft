import OutputParser from "./OutputParser";

export default class CairoOutputParser implements OutputParser {
    parseOutput(exitCode: number, stdout: string, stderr: string): string {
        if(stderr.includes('killed') && stderr.includes('timeout -s KILL')) {
            return 'TIMEOUT';
        }

        if (exitCode === 0) {
            return this.parseSuccess(stdout);
        } else {
            return this.parseError(stderr);
        }
    }


    parseSuccess(stdout: string): string {
        return stdout.split('\n')
            .filter(line => ! ['Compiling test(', 'Finished release target', 'testing ', 'test data_types'].some((word) => line.trim().startsWith(word)))
            .filter((line) => line.trim() !== '')
            .join('\n');
    }

    parseError(stderr: string): string {
        return stderr;
    }
}
