export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  feedback?: 'like' | 'dislike' | null;
  retrievedDocs?: RetrievedDocument[];
}

export interface RetrievedDocument {
  id: string;
  title: string;
  similarityScore: number;
  chunkId: string;
  page: number;
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
}
