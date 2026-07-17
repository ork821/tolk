import {spawnSync} from "node:child_process";
import {resolve} from "node:path";

const result = spawnSync(process.execPath, [resolve("node_modules/next/dist/bin/next"), "build"], {
    env: {
        ...process.env,
        NEXT_BUILD_MODE: "spa",
    },
    stdio: "inherit",
});

process.exit(result.status ?? 1);
