import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [mode, revision = "9c748fe935d22592cefe13d07363fb0f6298d540"] = process.argv.slice(2);
if (mode !== "test" && mode !== "serve") throw new Error("Seleciona test ou serve.");

const repository = fileURLToPath(new URL("../../../", import.meta.url));
const prefix = "smartpantry-us10-";
const tempRoot = realpathSync(tmpdir());
const workspace = mkdtempSync(join(tempRoot, prefix));
const app = join(workspace, "smartpantry");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} terminou com erro (${result.status}).`);
}

try {
  // A US10 ainda está separada da main. Executa os testes sobre a implementação publicada no Git.
  const archive = join(workspace, "source.tar");
  const commit = spawnSync("git", ["rev-parse", "--verify", "--end-of-options", revision + "^{commit}"], {
    cwd: repository, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"],
  });
  if (commit.error) throw commit.error;
  if (commit.status !== 0) throw new Error("Faz git fetch origin para obter a revisão da US10.");
  run("git", ["archive", "--format=tar", "--output", archive, commit.stdout.trim(), "smartpantry"], repository);
  run("tar", ["-xf", archive, "-C", workspace], repository);

  if (mode === "test") {
    copyFileSync(new URL("./product-lookup-regressions.test.mjs", import.meta.url),
      join(app, "tests", "product-lookup-regressions.test.mjs"));
    run(process.execPath, ["--test", "tests/product-lookup.test.mjs", "tests/product-lookup-regressions.test.mjs"], app);
  } else {
    const npm = process.env.npm_execpath;
    if (!npm) throw new Error("Inicia o servidor com npm run test:katalon:barcode.");
    run(process.execPath, [npm, "ci"], app);
    const server = spawn(process.execPath, [
      "node_modules/vite/bin/vite.js", "--host", "localhost", "--port", "5175", "--strictPort",
    ], { cwd: app, stdio: "inherit" });
    const stop = () => server.kill();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.once("close", (code) => {
        if (code && code !== 130) reject(new Error(`O servidor da US10 terminou com erro (${code}).`));
        else resolve();
      });
    });
  }
} finally {
  const target = realpathSync(workspace);
  if (dirname(target) === tempRoot && basename(target).startsWith(prefix)) {
    rmSync(target, { recursive: true, force: true, maxRetries: 3 });
  } else {
    console.error("A pasta temporária da US10 está fora do destino esperado.");
    process.exitCode = 1;
  }
}
