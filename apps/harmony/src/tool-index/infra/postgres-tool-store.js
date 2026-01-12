import pg from "pg";

const { Pool } = pg;

export class PostgresToolStore {
  constructor({ connectionString, dimensions }) {
    this.pool = new Pool({ connectionString });
    this.dimensions = dimensions;
  }

  async ensureSchema() {
    await this.pool.query("CREATE EXTENSION IF NOT EXISTS vector");
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS mcp_tool_index (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        input_schema JSONB NOT NULL,
        mcp_server_id TEXT NOT NULL,
        embedding vector(${this.dimensions}) NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );
  }

  async upsertToolDefinition(definition, embedding) {
    const query = `
      INSERT INTO mcp_tool_index (
        id,
        name,
        description,
        input_schema,
        mcp_server_id,
        embedding,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (id)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        input_schema = EXCLUDED.input_schema,
        mcp_server_id = EXCLUDED.mcp_server_id,
        embedding = EXCLUDED.embedding,
        updated_at = NOW()
    `;

    const values = [
      definition.id,
      definition.name,
      definition.description,
      definition.inputSchema,
      definition.mcpServerId,
      this.#toSqlVector(embedding)
    ];

    await this.pool.query(query, values);
  }

  async querySimilarTools(embedding, { limit }) {
    const result = await this.pool.query(
      `
        SELECT id, name, description, input_schema, mcp_server_id
        FROM mcp_tool_index
        ORDER BY embedding <-> $1
        LIMIT $2
      `,
      [this.#toSqlVector(embedding), limit]
    );

    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      inputSchema: row.input_schema,
      mcpServerId: row.mcp_server_id
    }));
  }

  async close() {
    await this.pool.end();
  }

  #toSqlVector(vector) {
    if (!Array.isArray(vector)) {
      throw new Error("Embedding vector must be an array");
    }

    return `[${vector.join(",")}]`;
  }
}
