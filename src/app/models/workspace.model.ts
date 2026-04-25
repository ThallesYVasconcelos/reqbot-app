export type WorkspaceType = 'PROFESSIONAL' | 'ACADEMIC';
export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface WorkspaceMemberDTO {
  id: string;
  userEmail: string;
  role: WorkspaceRole;
  createdAt: string;
}

export interface WorkspaceDTO {
  id: string;
  name: string;
  description: string | null;
  type: WorkspaceType;
  ownerEmail: string;
  members: WorkspaceMemberDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description: string | null;
  type: WorkspaceType;
}

export interface UpdateWorkspaceRequest {
  name: string;
  description: string | null;
  type: WorkspaceType;
}

export interface AddWorkspaceMemberRequest {
  userEmail: string;
  role: Exclude<WorkspaceRole, 'OWNER'>;
}

export interface ChatMessageDTO {
  id: string;
  userEmail: string | null;
  question: string;
  answer: string | null;
  answeredFromCache: boolean;
  chatbotAvailable: boolean;
  askedAt: string;
  requirementSetId: string | null;
  requirementSetName: string | null;
  workspaceId: string | null;
  workspaceName: string | null;
}

export interface ChatQuestionClusterDTO {
  rank: number;
  representativeQuestion: string;
  totalOccurrences: number;
  similarQuestionsSample: string[];
  firstAskedAt: string;
  lastAskedAt: string;
  averageSimilarity: number;
  similarityThreshold: number;
}
