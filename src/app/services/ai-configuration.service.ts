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
      return models.map(model => {
        if (typeof model === 'string') return { id: model, name: model };
        const raw = model as AiModelOption & { model?: string; modelId?: string; displayName?: string; modelName?: string; label?: string };
        const id = raw.id || raw.modelId || raw.model || raw.name || raw.displayName || raw.modelName || raw.label || '';
        return { ...raw, id, name: raw.name || raw.displayName || raw.modelName || raw.label || id };
      }).filter(model => !!model.id);
    }));
  }
}
