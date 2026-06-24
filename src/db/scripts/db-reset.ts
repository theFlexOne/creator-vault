import { readFileSync } from "fs";
import db from "../../lib/sqlite/db";
import backupDb from "./backup-db";

backupDb();

const schemaSql = readFileSync("src/db/schema.sql", "utf8");
db.exec(schemaSql);

// const seedSql: string = readdirSync("src/db/seeds")
//     .filter((file) => file.endsWith(".sql"))
//     .map((file) => readFileSync(`src/db/seeds/${file}`, "utf8"))
//     .join("\n");
// db.exec(seedSql);

console.log("Database reset complete.");


