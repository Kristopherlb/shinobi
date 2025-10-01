declare module '@modelcontextprotocol/sdk/server' {
  export class Server {
    constructor(metadata: any, options: any);
    connect(transport: any): Promise<void>;
    setRequestHandler(schema: any, handler: (...args: any[]) => any): void;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio' {
  export class StdioServerTransport {
    constructor(options?: any);
  }
}

declare module '@modelcontextprotocol/sdk/dist/types.js' {
  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;
  export const ReadResourceRequestSchema: any;
  export const ListResourcesRequestSchema: any;
}
