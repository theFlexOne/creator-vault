import { dumpSchema } from "./dump-schema";
import { dumpData, dumpTable } from "./dump-data";

const SCHEMA_DUMP_PATH = "src/db/schema.sql";
const DATA_DUMP_DIR = "src/db/seeds";

function main() {
    const args = process.argv.slice(2);
    const mode = args.at(0) || 'all';

    switch (mode) {
        case 'schema': {
            const outputPath = args.at(1) || SCHEMA_DUMP_PATH;
            dumpSchema(outputPath);
            break;
        }
        case 'table': {
            const tableName = args.at(1);
            const outputPath = args.at(2) || `${DATA_DUMP_DIR}/${tableName}.sql`;
            if (!tableName) {
                console.error('Please provide a table name for the table dump.');
                process.exit(1);
            }
            dumpTable(tableName, outputPath);
            break;
        }
        case 'data': {
            const outputPath = args.at(1) || DATA_DUMP_DIR;
            dumpData(outputPath);
            break;
        }
        case 'all':
        default: {
            dumpSchema(SCHEMA_DUMP_PATH);
            dumpData(DATA_DUMP_DIR);
            break;
        }
    }
}

main();
