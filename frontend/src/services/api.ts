const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ChatRequest {
  session_id: string;
  question: string;
  instructions?: string;
}

export interface ChatResponse {
  answer: string;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  indexed?: boolean;
  chunks?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: any[];
}

export const api = {
  async sendMessage(sessionId: string, question: string, abortSignal?: AbortSignal): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId, question }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async streamMessage(
    sessionId: string,
    question: string,
    onToken: (token: string) => void,
    abortSignal?: AbortSignal,
    instructions?: string,
    onAction?: (action: { type: string; query: string }) => void
  ): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId, question, stream: true, instructions }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by this browser.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      // Attempt to split by lines or SSE data format
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        let jsonStr = trimmed;
        // Handle SSE format "data: {...}"
        if (trimmed.startsWith('data:')) {
          jsonStr = trimmed.substring(5).trim();
          if (jsonStr === '[DONE]') continue; // common SSE end signal
        }

        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed.token) {
            onToken(parsed.token);
          } else if (parsed.action === 'search_offer') {
            onAction?.({ type: 'search_offer', query: parsed.query || '' });
          }
        } catch (e) {
          // Incomplete JSON or other format, ignore for now
        }
      }
    }
  },

  // Documents API
  async getDocuments(): Promise<Document[]> {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },

  async uploadDocument(file: File): Promise<{ status: string; filename: string; indexed?: boolean; chunks?: number; message?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async deleteDocument(id: string): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async clearAllDocuments(): Promise<{ status: string; deleted: number }> {
    const response = await fetch(`${API_BASE_URL}/documents/clear-all`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async summarizeDocument(filename: string): Promise<{ summary: string; chunks: number; filename: string }> {
    const response = await fetch(`${API_BASE_URL}/documents/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },

  async searchDownload(query: string, maxResults: number = 3): Promise<{ status: string; downloaded: any[]; message: string }> {
    const response = await fetch(`${API_BASE_URL}/documents/search-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, max_results: maxResults }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },

  async reindexDocuments(): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/documents/reindex`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  // Conversations API
  async getConversations(): Promise<Conversation[]> {
    const response = await fetch(`${API_BASE_URL}/conversation`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },

  async createConversation(): Promise<Conversation> {
    const response = await fetch(`${API_BASE_URL}/conversation/new`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async deleteConversation(id: string): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/conversation/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  async updateConversation(id: string, title: string): Promise<Conversation> {
    const response = await fetch(`${API_BASE_URL}/conversation/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
  },
};
