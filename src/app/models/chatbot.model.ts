export interface ChatbotConfig {
  id: string;
  isActive: boolean;
  requirementSetId: string;
  requirementSetName: string;
  workspaceId: string;
  workspaceName: string;
  startTime: string | null;
  endTime: string | null;
  showRequirementsToUsers?: boolean;
  createdAt: string;
  updatedAt: string;
  availableNow?: boolean;
  isAvailable?: boolean;
}

/** Corpo de POST /api/workspaces/{id}/chatbot/config (e config global legada) */
export interface CreateChatbotConfigRequest {
  requirementSetId: string;
  startTime?: string | null;
  endTime?: string | null;
  isActive?: boolean;
  showRequirementsToUsers?: boolean;
}

/** Resposta de POST /api/workspaces/{id}/chat/ask */
export interface WorkspaceChatResponse {
  answer: string;
  question: string;
  answeredAt: string;
  answeredFromCache: boolean;
  chatbotAvailable: boolean;
}

export interface ChatRequest {
  question: string;
}
