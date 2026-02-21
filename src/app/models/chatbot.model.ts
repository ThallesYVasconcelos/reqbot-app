export interface ChatbotConfig {
  id: string;
  isActive: boolean;
  requirementSetId: string;
  requirementSetName: string;
  startTime: string | null;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
  availableNow?: boolean;
  isAvailable?: boolean; 
}

export interface CreateChatbotConfigRequest {
  requirementSetId: string;
  startTime?: string | null;
  endTime?: string | null;
  isActive: boolean;
}

export interface ChatResponse {
  answer: string;
  question: string;
  timestamp: string;
  isAvailable: boolean;
}

export interface ChatRequest {
  question: string;
}
