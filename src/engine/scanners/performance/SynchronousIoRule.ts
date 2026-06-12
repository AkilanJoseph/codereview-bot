import type { IScanner } from '../../IScanner';
import type { Finding, PrFile } from '../../types';

// Synchronous fs and child_process calls that block the Node.js event loop.
const SYNC_IO_PATTERN =
  /\b(?:readFileSync|writeFileSync|appendFileSync|readdirSync|statSync|existsSync|mkdirSync|rmSync|unlinkSync|renameSync|copyFileSync|execSync|spawnSync|execFileSync)\s*\(/g;

export class SynchronousIoRule implements IScanner {
  analyze(files: PrFile[]): Finding[] {
    const findings: Finding[] = [];

    for (const file of files) {
      if (!isCodeFile(file.filePath)) continue;

      const lines = file.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';

        let match: RegExpExecArray | null;
        SYNC_IO_PATTERN.lastIndex = 0;
        while ((match = SYNC_IO_PATTERN.exec(line)) !== null) {
          const fnName = (match[0] ?? '').replace('(', '');
          findings.push({
            filePath: file.filePath,
            lineStart: i + 1,
            category: 'PERFORMANCE',
            severity: 'MEDIUM',
            ruleSlug: 'synchronous-io',
            message: `${fnName} is a synchronous I/O call at line ${i + 1} — blocks the Node.js event loop and degrades throughput under load.`,
            suggestion: `Replace with the async equivalent: ${asyncEquivalent(fnName)}. Await the result in an async function.`,
          });
        }
      }
    }

    return findings;
  }
}

function asyncEquivalent(fn: string): string {
  const map: Record<string, string> = {
    readFileSync: 'fs.promises.readFile()',
    writeFileSync: 'fs.promises.writeFile()',
    appendFileSync: 'fs.promises.appendFile()',
    readdirSync: 'fs.promises.readdir()',
    statSync: 'fs.promises.stat()',
    mkdirSync: 'fs.promises.mkdir()',
    rmSync: 'fs.promises.rm()',
    unlinkSync: 'fs.promises.unlink()',
    renameSync: 'fs.promises.rename()',
    copyFileSync: 'fs.promises.copyFile()',
    execSync: 'util.promisify(exec)()',
    spawnSync: 'spawn() with event listeners',
    execFileSync: 'util.promisify(execFile)()',
    existsSync: 'fs.promises.access()',
  };
  return map[fn] ?? `the async version of ${fn}`;
}

function isCodeFile(filePath: string): boolean {
  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}
