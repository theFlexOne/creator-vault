import { copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { defaultDbPath, dbDir } from "../../lib/sqlite/db";

const sourceDbPath = defaultDbPath;
const repoBackupPath = join(dbDir, 'db.sqlite.bak');
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const tempBackupPath = `/tmp/db.sqlite.${timestamp}`;

export default function backupDb() {
    console.log(`Creating restore snapshot at ${tempBackupPath}...`);
    mkdirSync(dirname(tempBackupPath), { recursive: true });
    copyFileSync(sourceDbPath, tempBackupPath);

    console.log(`Updating repo backup at ${repoBackupPath}...`);
    mkdirSync(dirname(repoBackupPath), { recursive: true });
    copyFileSync(sourceDbPath, repoBackupPath);

    console.log("Backup complete.");
}

try {
    backupDb();
} catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
}