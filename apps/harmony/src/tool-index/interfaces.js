/**
 * @typedef {object} EmbeddingProvider
 * @property {(text: string) => Promise<number[]>} embedText
 */

/**
 * @typedef {object} ToolStore
 * @property {() => Promise<void>} ensureSchema
 * @property {(definition: object, embedding: number[]) => Promise<void>} upsertToolDefinition
 * @property {(embedding: number[], options: { limit: number }) => Promise<object[]>} querySimilarTools
 * @property {() => Promise<void>} close
 */

export const __interfaces = {};
