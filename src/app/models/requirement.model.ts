export interface Requirement {
  uuid: string;
  requirementId: string;
  rawRequirement?: string;
  refinedRequirement: string;
  analise?: string;
  ambiguityWarnings?: string[];
  createdAt: string;
  updatedAt: string;
  requirementSetId: string;
  requirementSetName: string;
}

export interface CreateRequirementRequest {
  requirementSetId: string;
  requirement: string;
}

export interface SaveRequirementRequest {
  requirementSetId: string;
  rawRequirement: string;
  refinedRequirement: string;
  useRefinedVersion: boolean;
  analise?: string;
  ambiguityWarnings?: string[];
}

export interface UpdateRequirementRequest {
  rawRequirement: string;
  refinedRequirement: string;
  useRefinedVersion: boolean;
}

export type RequirementHistoryActionType = 'CREATED' | 'UPDATED';

export interface RequirementHistory {
  id: string;
  requirementUuid: string;
  requirementId: string;
  rawRequirement?: string;
  refinedRequirement: string;
  analise?: string;
  ambiguityWarnings?: string[];
  actionType: RequirementHistoryActionType;
  createdAt: string;
}

export interface RequirementReportConflict {
  conflictingRequirementId: string;
  conflictingRequirementIdStr: string;
  conflictingText: string;
  similarityScore: number;
  suggestion: string;
}

export interface RequirementReportItem {
  requirementId: string;
  requirementIdStr: string;
  refinedRequirement: string;
  problems: string[];
  conflicts: RequirementReportConflict[];
  resolutionSuggestions: string[];
  ambiguityWarnings?: string[];
}

export interface RequirementReport {
  requirementSetId: string;
  requirementSetName: string;
  requirementsWithProblems: RequirementReportItem[];
}
