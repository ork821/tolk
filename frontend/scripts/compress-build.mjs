import {readdir, readFile, writeFile} from "node:fs/promises";
import {extname, join} from "node:path";
import {fileURLToPath} from "node:url";
import {gzipSync} from "node:zlib";

const assetsDirectory = fileURLToPath(new URL("../build/client/assets/", import.meta.url));
const compressibleExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".xml"]);
const minimumSizeBytes = 1024;

async function compressDirectory(directory) {
  const entries = await readdir(directory, {withFileTypes: true});

  await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await compressDirectory(path);
      return;
    }

    if (!compressibleExtensions.has(extname(entry.name)) || entry.name.endsWith(".gz")) {
      return;
    }

    const content = await readFile(path);
    if (content.length < minimumSizeBytes) return;

    await writeFile(`${path}.gz`, gzipSync(content, {level: 9}));
  }));
}

await compressDirectory(assetsDirectory);
