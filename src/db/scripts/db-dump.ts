import { execSync } from "child_process";

const args = process.argv.slice(2);

const mode = args.at(0) || 'all';

function dumpSchema(output: string) {
    const command = `sqlite3 src/db/db.sqlite ".schema" > ${output}`;
    console.log(`Dumping schema to ${output}...`);
    execSync(command);
    console.log('Schema dump complete.');
}

function dumpTable(tableName: string, output: string) {
    const command = `sqlite3 src/db/db.sqlite ".mode insert ${tableName}" "SELECT * FROM ${tableName};" > ${output}`;
    console.log(`Dumping data from table ${tableName} to ${output}...`);
    execSync(command);
    console.log(`Table dump for ${tableName} complete.`);
}

function dumpData(outputDirectory: string) {
    console.log(`Dumping data for all tables to ${outputDirectory}...`);
    const command = `sh -c "for t in \$(sqlite3 src/db/db.sqlite \\\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';\\\"); do sqlite3 src/db/db.sqlite \\\".mode insert \\\$t\\\" \\\"SELECT * FROM \\\$t;\\\" > \\\"${outputDirectory}/\\$t.sql\\\"; done"`;
    execSync(command);
    console.log('Data dump for all tables complete.');
}

switch (mode) {
    case 'schema':
        dumpSchema(args.at(1) || 'src/db/schema.sql');
        break;
    case 'table':
        const tableName = args.at(1);
        if (!tableName) {
            console.error('Please provide a table name for the table dump.');
            process.exit(1);
        }
        dumpTable(tableName, args.at(2) || `src/db/seeds/${tableName}.sql`);
        break;
    case 'data':
        dumpData(args.at(1) || 'src/db/seeds');
        break;
    case 'all':
    default:
        dumpSchema('src/db/schema.sql');
        dumpData('src/db/seeds');
        break;
}