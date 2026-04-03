import { OllamaConfig, AIResponse } from '../types/config.js';
import { AIError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class OllamaService {
  private config: OllamaConfig;

  constructor(config: OllamaConfig) {
    this.config = config;
  }

  async generate(prompt: string, systemPrompt?: string): Promise<AIResponse> {
    try {
      logger.debug('Sending request to Ollama...');
      
      const response = await fetch(`${this.config.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
          options: {
            temperature: this.config.temperature || 0.1,
          },
        }),
      });

      if (!response.ok) {
        throw new AIError(`Ollama request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.debug(`Ollama response received (${data.eval_count || 0} tokens)`);

      return {
        content: data.response,
        model: data.model,
        tokens: {
          prompt: data.prompt_eval_count || 0,
          completion: data.eval_count || 0,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      
      logger.error('Ollama request failed', error);
      throw new AIError(
        'Failed to communicate with Ollama. Make sure Ollama is running.',
        { originalError: error }
      );
    }
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<AIResponse> {
    try {
      logger.debug('Sending chat request to Ollama...');
      
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          stream: false,
          options: {
            temperature: this.config.temperature || 0.1,
          },
        }),
      });

      if (!response.ok) {
        throw new AIError(`Ollama chat request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        content: data.message.content,
        model: data.model,
        tokens: {
          prompt: data.prompt_eval_count || 0,
          completion: data.eval_count || 0,
          total: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
        finishReason: data.done ? 'stop' : 'length',
      };
    } catch (error) {
      if (error instanceof AIError) throw error;
      
      logger.error('Ollama chat request failed', error);
      throw new AIError(
        'Failed to communicate with Ollama. Make sure Ollama is running.',
        { originalError: error }
      );
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });
      
      if (!response.ok) return false;
      
      const data = await response.json();
      const hasModel = data.models?.some((m: any) => m.name.includes(this.config.model));
      
      if (!hasModel) {
        logger.warn(`Model ${this.config.model} not found. Available models:`, 
          data.models?.map((m: any) => m.name).join(', '));
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      return [];
    }
  }
}
