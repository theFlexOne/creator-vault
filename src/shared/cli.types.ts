import { CommandModule } from 'yargs'

export type YTFetchCommand = CommandModule<
    {},
    {
        inputs: string[]
        limit: number | null
        save: boolean
        batch: number
    }
>
