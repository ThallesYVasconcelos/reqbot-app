export interface ChatbotConfig {
  id: string;
  name: string;
  isActive: boolean;
  active?: boolean;
  accessCode?: string;
  requirementSetId: string;
  requirementSetName?: string;
  workspaceId?: string;
  workspaceName?: string;
  startTime: string | null;
  endTime: string | null;
  showRequirementsToUsers?: boolean;
  createdAt?: string;
  updatedAt?: string;
  availableNow?: boolean;
  isAvailable?: boolean;
}

export interface CreateChatbotConfigRequest {
  name: string;
  requirementSetId: string;
  startTime?: string | null;
  endTime?: string | null;
  showRequirementsToUsers?: boolean;
}

export interface JoinChatbotRequest {
  code: string;
}

export interface WorkspaceChatResponse {
  answer: string;
  question: string;
  answeredAt: string;
  answeredFromCache?: boolean;
  chatbotAvailable?: boolean;
}

export interface ChatRequest {
  question: string;
}
