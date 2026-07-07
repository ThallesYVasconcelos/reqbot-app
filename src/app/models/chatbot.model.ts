export interface ChatbotConfig {
  id: string;
  chatbotId?: string;
  chatbot_id?: string;
  name: string;
  chatbotName?: string;
  displayName?: string;
  botName?: string;
  assistantName?: string;
  configName?: string;
  configurationName?: string;
  isActive: boolean;
  active?: boolean;
  accessCode?: string;
  code?: string;
  access_code?: string;
  inviteCode?: string;
  requirementSetId: string;
  projectId?: string;
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

export interface ChatbotAccessCodeResponse {
  accessCode: string | null;
  access_code?: string | null;
  code?: string | null;
  inviteCode?: string | null;
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
