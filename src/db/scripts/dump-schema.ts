import { execSync } from "child_process";
import { writeFileSync } from "fs";
import db, { defaultDbPath } from "../../lib/sqlite/db";

type SchemaObjectType = 'table' | 'view' | 'index' | 'trigger';

function getNativeSchemaStatements() {
    const dumpOutput = execSync(`sqlite3 "${defaultDbPath}" ".dump"`).toString();

    const statements = dumpOutput
        .split(/;\s*\n/)
        .map((statement) => statement.trim())
        .filter(Boolean)
        .map((statement) => (statement.endsWith(';') ? statement : `${statement};`));

    return statements.filter((statement) => statement.startsWith('CREATE '));
}

function getSchemaDropStatements() {
    const schemaRows = db.prepare(
        `SELECT type, name
         FROM sqlite_schema
         WHERE sql IS NOT NULL
           AND type IN ('table', 'view', 'index', 'trigger')
           AND name NOT LIKE 'sqlite_%'
         ORDER BY CASE type
             WHEN 'table' THEN 0
             WHEN 'view' THEN 1
             WHEN 'index' THEN 2
             WHEN 'trigger' THEN 3
             ELSE 4
         END, name`
    ).all() as Array<{ type: SchemaObjectType; name: string }>;

    return schemaRows
        .map(({ type, name }) => `DROP ${type.toUpperCase()} IF EXISTS ${name};`)
        .join('\n');
}

export function dumpSchema(output: string) {
    const createStatements = getNativeSchemaStatements();
    const dropStatements = getSchemaDropStatements();

    const rawSql = createStatements.join('\n');

    console.log(`Dumping schema...`);
    writeFileSync(output, [dropStatements, rawSql].filter(Boolean).join('\n\n\n'));
    console.log(`Schema dump saved to ${output}.`);
}
