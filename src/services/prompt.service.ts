import prompts from 'prompts';

export type SelectOption<T extends string> = {
    title: string;
    value: T;
    description?: string;
};

type PromptValidation<T> = (value: T) => true | string;

export async function askConfirm(
    message: string,
    initial = true,
): Promise<boolean | undefined> {
    const response = await prompts({
        type: 'confirm',
        name: 'value',
        message,
        initial,
    });
    return response.value;
}

export async function askSelect<T extends string>(
    message: string,
    options: SelectOption<T>[],
    initial?: number,
): Promise<T | undefined> {
    const response = await prompts({
        type: 'select',
        name: 'value',
        message,
        initial,
        choices: options.map((option) => ({
            title: option.title,
            value: option.value,
            description: option.description,
        })),
    });

    return response.value as T | undefined;
}

export async function askText(
    message: string,
    options: {
        initial?: string;
        validate?: PromptValidation<string>;
    } = {},
): Promise<string | undefined> {
    const response = await prompts({
        type: 'text',
        name: 'value',
        message,
        initial: options.initial,
        validate: options.validate,
    });

    return response.value;
}

export async function askNumber(
    message: string,
    options: {
        initial?: number;
        validate?: PromptValidation<number>;
    } = {},
): Promise<number | undefined> {
    const response = await prompts({
        type: 'number',
        name: 'value',
        message,
        initial: options.initial,
        validate: options.validate,
    });

    return response.value;
}
