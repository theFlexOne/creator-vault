import { askSelect, type SelectOption } from '../services/prompt.service';

export type UiAction =
    | 'ingest-channel-profile'
    | 'ingest-channel-videos'
    | 'ingest-transcripts'
    | 'run-full-ingest-pipeline'
    | 'test-connection'
    | 'exit';

export const uiMenuOptions: SelectOption<UiAction>[] = [
    { title: 'Ingest channel metadata', value: 'ingest-channel-profile' },
    { title: 'Ingest channel videos', value: 'ingest-channel-videos' },
    { title: 'Ingest transcripts', value: 'ingest-transcripts' },
    { title: 'Run full ingest pipeline', value: 'run-full-ingest-pipeline' },
    { title: 'Test connection', value: 'test-connection' },
    { title: 'Exit', value: 'exit' },
];

const uiActionLabels: Record<UiAction, string> = {
    'ingest-channel-profile': 'Ingest channel metadata',
    'ingest-channel-videos': 'Ingest channel videos',
    'ingest-transcripts': 'Ingest transcripts',
    'run-full-ingest-pipeline': 'Run full ingest pipeline',
    'test-connection': 'Test connection',
    exit: 'Exit',
};

export function getUiActionLabel(action: UiAction): string {
    return uiActionLabels[action];
}

export async function promptForUiAction(): Promise<UiAction | undefined> {
    return askSelect('Choose a workflow', uiMenuOptions);
}
