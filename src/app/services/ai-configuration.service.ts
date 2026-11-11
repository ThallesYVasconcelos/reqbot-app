import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  AiConfiguration,
  AiModelOption,
  SaveAiConfigurationRequest
} from '../models/ai-configuration.model';

@Injectable({ providedIn: 'root' })
export class AiConfigurationService {
  constructor(private api: ApiService) {}

  get(workspaceId: string): Observable<AiConfiguration | null> {
    return this.api.get<AiConfiguration>(`/api/workspaces/${workspaceId}/ai-configuration`);
  }

  save(workspaceId: string, request: SaveAiConfigurationRequest): Observable<AiConfiguration> {
    return this.api.put<AiConfiguration>(`/api/workspaces/${workspaceId}/ai-configuration`, request);
  }

  remove(workspaceId: string): Observable<void> {
    return this.api.delete<void>(`/api/workspaces/${workspaceId}/ai-configuration`);
  }

  models(workspaceId: string): Observable<AiModelOption[]> {
    return this.api.get<AiModelOption[] | string[] | { models: AiModelOption[] | string[] }>(
      `/api/workspaces/${workspaceId}/ai-configuration/models`
    ).pipe(map(response => {
      const models = Array.isArray(response) ? response : response.models ?? [];
      return models.map(model => typeof model === 'string' ? { id: model } : model);
    }));
  }
}
