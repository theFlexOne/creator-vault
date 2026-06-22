import prompts from 'prompts';

export async function askConfirm(message: string): Promise<boolean> {
    const response = await prompts({
        type: 'confirm',
        name: 'value',
        message,
        initial: true
    });
    return response.value;
}

export async function askSelect(message: string, options: { title: string, value: string }[]): Promise<string> {
    const response = await prompts({
        type: 'select',
        name: 'value',
        message,
        choices: options.map(o => ({ title: o.title, value: o.value }))
    });
    return response.value;
}
