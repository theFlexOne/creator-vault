import { writeFileSync } from "fs";
import db from "../../lib/sqlite/db";

function quoteSqlValue(value: unknown) {
    if (value === null || value === undefined) {
        return 'NULL';
    }

    if (typeof value === 'number' || typeof value === 'bigint') {
        return String(value);
    }

    if (typeof value === 'boolean') {
        return value ? '1' : '0';
    }

    if (Buffer.isBuffer(value)) {
        return `X'${value.toString('hex')}'`;
    }

    return `'${String(value).replace(/'/g, "''")}'`;
}


function buildInsertStatement(tableName: string, row: Record<string, unknown>) {
    const columns = Object.keys(row);
    const values = columns.map((column) => quoteSqlValue(row[column]));

    return `INSERT INTO ${tableName} (${columns.join(',')}) VALUES(${values.join(',')});`;
}


export function dumpTable(tableName: string, output: string) {
    console.log(`Dumping data from table ${tableName} to ${output}...`);
    const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as Array<Record<string, unknown>>;
    const inserts = rows.map((row) => buildInsertStatement(tableName, row)).join('\n');
    writeFileSync(output, inserts ? `${inserts}\n` : '');
    console.log(`Table dump for ${tableName} complete.`);
}

export function dumpData(outputDirectory: string) {
    console.log(`Dumping data for all tables to ${outputDirectory}...`);

    const tables = db.prepare(
        `SELECT name
         FROM sqlite_master
         WHERE type = 'table'
           AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
    ).all() as Array<{ name: string }>;

    for (const { name } of tables) {
        dumpTable(name, `${outputDirectory}/${name}.sql`);
    }

    console.log('Data dump for all tables complete.');
}