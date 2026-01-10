# AI Provider Component

Registers connection metadata for AI/LLM providers so other components can bind to a standardized `ai:provider` capability.

## Supported Providers
- OpenAI (`openai`)
- Google Gemini (`gemini`)
- Anthropic (`anthropic`)
- AWS Bedrock (`bedrock`)
- Ollama (`ollama`)

## Capability
### `ai:provider`
Provides the following fields:
- `providerType`
- `model`
- `endpoint`
- `connectionConfig`
- `environmentVariables`

## Example Usage
```yaml
components:
  - name: local-llm
    type: ai-provider
    config:
      provider: ollama
      model: llama3.1
      endpoint: http://localhost:11434

  - name: bedrock-llm
    type: ai-provider
    config:
      provider: bedrock
      model: anthropic.claude-3-sonnet-20240229-v1:0
      region: us-east-1
```

## Configuration
See [`Config.schema.json`](./Config.schema.json) for full schema details.
