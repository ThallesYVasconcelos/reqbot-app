export interface RequirementSet {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  requirementsCount?: number; 
}

export interface CreateRequirementSetRequest {
  name: string;
  description: string;
}
