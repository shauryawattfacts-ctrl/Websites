/** run.mjs — tiny promise wrapper around exec so build scripts stay dependency-free. */
import { exec } from 'node:child_process';

export function execaless(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 8 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stdout, stderr }));
      else resolve({ stdout, stderr });
    });
  });
}
