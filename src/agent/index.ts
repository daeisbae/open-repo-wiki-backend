import { LLMProvider } from '../llm/llm-provider'
import { SchemaParser } from './schema-parser'
import { getSchema, SchemaType } from './schema-factory'
import {
    PromptGenerator,
    PromptType,
    RepoInfo,
} from './prompt-generator'
import { CodePrompt, FolderPrompt } from './prompt'
import CodeSplitter from './code-splitter'

/**
 * Abstract base class for processing prompts using LLM
 */
abstract class BaseProcessor {
    protected llm: LLMProvider
    protected schemaParser!: SchemaParser
    protected promptGenerator!: PromptGenerator

    /**
     * Creates a new BaseProcessor instance
     * @param llm - The LLM provider instance to use for processing
     */
    constructor(llm: LLMProvider) {
        this.llm = llm
    }

    /**
     * Process the given prompt using LLM and parse the response into JSON format
     * @param {string} prompt - The prompt to process
     * @returns Parsed object from the LLM response
     */
    protected async process(prompt: string): Promise<any> {
        const response = await this.llm.run(prompt, [])
        return await this.schemaParser.parse(response)
    }
}

export interface SummaryOutput {
    summary: string
    usage: string
}

/**
 * Processes code-related prompts with specific schema and formatting
 * @example
 * const llm = new GoogleProvider(...)
 * const codeProcessor = new CodeProcessor(llm)
 * const sourceCode = `function add(a: number, b: number): number { return a + b }`
 * const result = await codeProcessor.process(sourceCode)
 */
export class CodeProcessor extends BaseProcessor {
    private codeSplitter: CodeSplitter

    /**
     * Creates a new CodeProcessor instance with file schema type
     * @param llm - The LLM provider instance
     */
    constructor(llm: LLMProvider) {
        super(llm)
        this.codeSplitter = new CodeSplitter(200, 25)
        this.schemaParser = new SchemaParser(getSchema(SchemaType.FILE))
        this.promptGenerator = new PromptGenerator(
            {
                template:
                    'The following instruction is given:\n{requirements}\n{formatInstructions}\n' +
                    'The given repository owner is {repoOwner} with repository name of {repoName}\n' +
                    'The commit SHA referenced is {commitSha}\n' +
                    'The path of the file is {path}\n' +
                    'Below is the code for your task: {code}',
            },
            PromptType.File
        )
    }

    /**
     * Process the given code string
     * @param {string} code - Source code to process
     * @param {RepoInfo} repoInfo - Information about the repository
     * @returns Processed and parsed JSON object defined in schema factory
     */
    async generate(code: string, repoInfo: RepoInfo): Promise<SummaryOutput | null> {
        const extension = repoInfo.path.split('.').pop()
        if (!extension) {
            console.warn('No extension found in the file path')
            return null
        }

        const splittedDoc = await this.codeSplitter.splitCode(extension, code)
        if (!splittedDoc) {
            console.warn('Code splitting failed')
            return null
        }

        const prompt = await this.promptGenerator.generate(
            {
                requirements: CodePrompt,
                formatInstructions: this.schemaParser.formalInstructions,
                ...repoInfo,
            },
            splittedDoc
        )

        if (!prompt) {
            console.warn('Prompt generation failed')
            return null
        }

        return await super.process(prompt)
    }
}

/**
 * Processes folder-related prompts with specific schema and formatting
 * @example
 * const llm = new new GoogleProvider(...)
 * const folderProcessor = new FolderProcessor(llm)
 * const folderSummaries = ['{file 1 summary}', '{file 2 summary}']
 * const result = await folderProcessor.process(folderSummaries)
 */
export class FolderProcessor extends BaseProcessor {
    /**
     * Creates a new FolderProcessor instance with folder schema type
     * @param {LLMProvider} llm - The LLM provider instance
     */
    constructor(llm: LLMProvider) {
        super(llm)
        this.schemaParser = new SchemaParser(getSchema(SchemaType.FOLDER))
        this.promptGenerator = new PromptGenerator(
            {
                template:
                    'The following instruction is given:\n{requirements}\n{formatInstructions}\n' +
                    'The given repository owner is {repoOwner} with repository name of {repoName}\n' +
                    'The commit SHA referenced is {commitSha}\n' +
                    'The path of the folder is {path}\n' +
                    'Below are the summaries for the codebase:\n{ai_summaries}',
            },
            PromptType.Folder
        )
    }

    /**
     * Process the given code string
     * @param {Array<string>} folder - summaries of files by LLMs
     * @param {RepoInfo} repoInfo - Information about the repository
     * @returns Processed and parsed JSON object defined in schema factory
     */
    async generate(folder: string[], repoInfo: RepoInfo): Promise<SummaryOutput | null> {

        const prompt = await this.promptGenerator.generate(
            {
                requirements: FolderPrompt,
                formatInstructions: this.schemaParser.formalInstructions,
                ...repoInfo
            },
            undefined,
            folder
        )

        if (!prompt) {
            console.log('Prompt generation failed, Empty folder or files')
            return null
        }

        return await super.process(prompt)
    }
}
