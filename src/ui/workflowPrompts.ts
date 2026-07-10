import { askConfirm, askNumber, askText } from '../services/prompt.service';

export type WorkflowPromptResult<T> =
    | { kind: 'submit'; value: T }
    | { kind: 'cancel' }
    | { kind: 'aborted-save' };

export type ChannelProfileWorkflowOptions = {
    inputs: string[];
    save: boolean;
};

export type ChannelVideosWorkflowOptions = {
    inputs: string[];
    limit: number;
    save: boolean;
    batch: number;
    createChannel: boolean;
};

export type TranscriptWorkflowOptions = {
    inputs: string[];
    limit: number;
    save: boolean;
};

export type FullPipelineWorkflowOptions = {
    inputs: string[];
    save: boolean;
    videoLimit: number;
    videoBatch: number;
    createChannel: boolean;
    transcriptLimit: number;
};

export function parseWorkflowInputs(value: string): string[] {
    const hasCommaOrNewline = /[\n,]/.test(value);

    if (!hasCommaOrNewline) {
        const trimmed = value.trim();
        return trimmed ? [trimmed] : [];
    }

    return value
        .split(/[\n,]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
}

function validateInputs(value: string): true | string {
    return parseWorkflowInputs(value).length > 0
        ? true
        : 'Enter at least one input.';
}

function validatePositiveNumber(value: number): true | string {
    return Number.isFinite(value) && value > 0
        ? true
        : 'Enter a number greater than 0.';
}

async function promptForInputs(): Promise<string[] | undefined> {
    const value = await askText(
        'Enter channel inputs as one file path or comma/newline-separated identifiers',
        {
            validate: validateInputs,
        },
    );

    return value === undefined ? undefined : parseWorkflowInputs(value);
}

async function confirmSaveIfNeeded(
    save: boolean,
    workflowLabel: string,
): Promise<'continue' | 'cancel' | 'aborted-save'> {
    if (!save) {
        return 'continue';
    }

    const confirmed = await askConfirm(
        `This will run ${workflowLabel} with save=true and write to SQLite. Continue?`,
        false,
    );

    if (confirmed === undefined) {
        return 'cancel';
    }

    return confirmed ? 'continue' : 'aborted-save';
}

export async function promptForChannelProfileWorkflow(): Promise<
    WorkflowPromptResult<ChannelProfileWorkflowOptions>
> {
    const inputs = await promptForInputs();
    if (!inputs) {
        return { kind: 'cancel' };
    }

    const save = await askConfirm('Persist channel metadata results to SQLite?', false);
    if (save === undefined) {
        return { kind: 'cancel' };
    }

    const saveDecision = await confirmSaveIfNeeded(save, 'channel metadata ingest');
    if (saveDecision === 'cancel') {
        return { kind: 'cancel' };
    }

    if (saveDecision === 'aborted-save') {
        return { kind: 'aborted-save' };
    }

    return {
        kind: 'submit',
        value: {
            inputs,
            save,
        },
    };
}

export async function promptForChannelVideosWorkflow(): Promise<
    WorkflowPromptResult<ChannelVideosWorkflowOptions>
> {
    const inputs = await promptForInputs();
    if (!inputs) {
        return { kind: 'cancel' };
    }

    const limit = await askNumber('Maximum videos to process per channel', {
        initial: 100,
        validate: validatePositiveNumber,
    });
    if (limit === undefined) {
        return { kind: 'cancel' };
    }

    const batch = await askNumber('Batch size for /videos metadata requests', {
        initial: 10,
        validate: validatePositiveNumber,
    });
    if (batch === undefined) {
        return { kind: 'cancel' };
    }

    const save = await askConfirm('Persist video and transcript results to SQLite?', false);
    if (save === undefined) {
        return { kind: 'cancel' };
    }

    let createChannel = false;

    if (save) {
        const createChannelResponse = await askConfirm(
            'Create or reuse a profile-backed channel if one is missing?',
            false,
        );
        if (createChannelResponse === undefined) {
            return { kind: 'cancel' };
        }

        createChannel = createChannelResponse;
    }

    const saveDecision = await confirmSaveIfNeeded(save, 'channel video ingest');
    if (saveDecision === 'cancel') {
        return { kind: 'cancel' };
    }

    if (saveDecision === 'aborted-save') {
        return { kind: 'aborted-save' };
    }

    return {
        kind: 'submit',
        value: {
            inputs,
            limit,
            save,
            batch,
            createChannel,
        },
    };
}

export async function promptForTranscriptWorkflow(): Promise<
    WorkflowPromptResult<TranscriptWorkflowOptions>
> {
    const inputs = await promptForInputs();
    if (!inputs) {
        return { kind: 'cancel' };
    }

    const limit = await askNumber('Maximum transcripts to process per channel', {
        initial: 10,
        validate: validatePositiveNumber,
    });
    if (limit === undefined) {
        return { kind: 'cancel' };
    }

    const save = await askConfirm('Persist transcript results to SQLite?', false);
    if (save === undefined) {
        return { kind: 'cancel' };
    }

    const saveDecision = await confirmSaveIfNeeded(save, 'transcript ingest');
    if (saveDecision === 'cancel') {
        return { kind: 'cancel' };
    }

    if (saveDecision === 'aborted-save') {
        return { kind: 'aborted-save' };
    }

    return {
        kind: 'submit',
        value: {
            inputs,
            limit,
            save,
        },
    };
}

export async function promptForFullPipelineWorkflow(): Promise<
    WorkflowPromptResult<FullPipelineWorkflowOptions>
> {
    const inputs = await promptForInputs();
    if (!inputs) {
        return { kind: 'cancel' };
    }

    const save = await askConfirm(
        'Persist results to SQLite for all full-pipeline steps?',
        false,
    );
    if (save === undefined) {
        return { kind: 'cancel' };
    }

    const videoLimit = await askNumber('Maximum videos per channel during the video step', {
        initial: 100,
        validate: validatePositiveNumber,
    });
    if (videoLimit === undefined) {
        return { kind: 'cancel' };
    }

    const videoBatch = await askNumber('Batch size for the video step', {
        initial: 10,
        validate: validatePositiveNumber,
    });
    if (videoBatch === undefined) {
        return { kind: 'cancel' };
    }

    const transcriptLimit = await askNumber('Maximum transcripts per channel during the transcript step', {
        initial: 10,
        validate: validatePositiveNumber,
    });
    if (transcriptLimit === undefined) {
        return { kind: 'cancel' };
    }

    let createChannel = false;

    if (save) {
        const createChannelResponse = await askConfirm(
            'Create or reuse a profile-backed channel during the video step if one is missing?',
            false,
        );
        if (createChannelResponse === undefined) {
            return { kind: 'cancel' };
        }

        createChannel = createChannelResponse;
    }

    const saveDecision = await confirmSaveIfNeeded(save, 'the full ingest pipeline');
    if (saveDecision === 'cancel') {
        return { kind: 'cancel' };
    }

    if (saveDecision === 'aborted-save') {
        return { kind: 'aborted-save' };
    }

    return {
        kind: 'submit',
        value: {
            inputs,
            save,
            videoLimit,
            videoBatch,
            createChannel,
            transcriptLimit,
        },
    };
}
