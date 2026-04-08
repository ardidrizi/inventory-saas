declare module 'openai' {
  export default class OpenAI {
    constructor(config: { apiKey: string });
    chat: {
      completions: {
        create(payload: Record<string, unknown>): Promise<{
          choices?: Array<{ message?: { content?: string | null } }>;
        }>;
      };
    };
  }
}
