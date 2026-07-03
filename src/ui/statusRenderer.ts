export type UiStatusRenderer = {
    update(text: string): void;
    done(): void;
};

export async function createUiStatusRenderer(): Promise<UiStatusRenderer> {
    const { default: logUpdate } = await import('log-update');

    return {
        update: (text: string) => {
            logUpdate(text);
        },
        done: () => {
            logUpdate.done();
        },
    };
}
