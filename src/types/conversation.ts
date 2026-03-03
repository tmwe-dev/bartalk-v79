export interface Message {
  id: string;
  conversationId: string;
  senderType: 'human' | 'assistant' | 'system';
  senderName: string;
  content: string;
  createdAt: string;
  turnId?: string;
  provider?: string;
  tokensIn?: number;
  tokensOut?: number;
  duration?: number;
  isDemo?: boolean;
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  turnIndex: number;
  createdAt: string;
  updatedAt: string;
}

export type ConversationMode = 'standard' | 'consultation' | 'bar_realtime';
export type TurnStrategy = 'round_robin' | 'random' | 'smart';
