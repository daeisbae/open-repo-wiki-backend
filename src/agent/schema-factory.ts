import { z, ZodSchema } from 'zod'

/**
 * Enum for schema types.
 * @readonly
 * @enum {string}
 */
export enum SchemaType {
    FILE = 'file',
    FOLDER = 'folder',
}

/**
 * Returns a predefined structured output schema based on the specified schema type.
 * @param {SchemaType} schemaType - The type of schema to generate. Use SchemaType enum.
 * @returns {ZodSchema} The corresponding Zod schema.
 * @throws {Error} Will throw an error if the schema type is unknown.
 */
export function getSchema(schemaType: SchemaType): ZodSchema {
    switch (schemaType) {
        /*
File Schema Example Output:
{
  "usage": "Parses raw input data and transforms it into a structured format.",
  "summary": "This file implements a parser for processing input data. The main entry point is the [`parseInput`](#L15-L30) function, which takes raw data and transforms it into a structured format. Error handling is managed within the [`handleParsingErrors`](#L45-L60) function to ensure robustness.",
}
*/
        case SchemaType.FILE:
            return z.object({
                usage: z
                    .string()
                    .describe(
                        'What the file is used for. Describe less than 10 words (ex. Data Parsing, API Requests, etc.)'
                    ),
                summary: z
                    .string()
                    .describe(
                        'Summary of the file talking about its main purpose, and its role in the project.\n'
                        + 'Include Markdown links to important code blocks within this file using the format\n`'
                        + '[{Description of Code Block}]({Full github url of the file including the start line with optional ending line}#L{startLine}-L{endLine})` where applicable.\n'
                        + 'Also you should not return more than 2-3 paragraphs of summary.'
                    ),
            })

        /*
Folder Schema Example Output:
{
  "usage": "Contains reusable React components for the application's user interface.",
  "summary": "The `components` folder houses the application's building blocks for the user interface. It includes various reusable components like the [`Button`](src/components/Button.tsx) for user interactions and the [`Modal`](src/components/Modal.tsx) for displaying overlay content. The [`Card`](src/components/Card.tsx) component is used throughout the application to present information in a structured manner.",
}
*/
        case SchemaType.FOLDER:
            return z.object({
                usage: z.string().describe('What the folder is used for. Describe less than 10 words (ex. Server Lifecycle Management, API Utility Functions, etc.)'),
                summary: z
                    .string()
                    .describe(
                        'Summary of the folder, its main purpose, and its role in the project. Include Markdown links to important code blocks within the file using the format `[{Description of Code Block}]({Full github url of the file including the start line with optional ending line}#L{startLine}-L{endLine})` where applicable.'
                    )
            })

        default:
            throw new Error(`Unknown schema type: ${schemaType}`)
    }
}
