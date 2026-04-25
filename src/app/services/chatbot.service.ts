import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ChatbotConfig,
  CreateChatbotConfigRequest,
  ChatResponse,
  ChatRequest
} from '../models/chatbot.model';
import { Requirement } from '../models/requirement.model';
import { ChatMessageDTO } from '../models/workspace.model';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  constructor(private api: ApiService) {}

  // Admin endpoints
  createConfig(request: CreateChatbotConfigRequest): Observable<ChatbotConfig> {
    return this.api.post<ChatbotConfig>('/api/admin/chatbot/config', request);
  }

  getActiveConfig(): Observable<ChatbotConfig> {
    return this.api.get<ChatbotConfig>('/api/admin/chatbot/config/active');
  }

  getAllConfigs(): Observable<ChatbotConfig[]> {
    return this.api.get<ChatbotConfig[]>('/api/admin/chatbot/config');
  }

  getConfigById(id: string): Observable<ChatbotConfig> {
    return this.api.get<ChatbotConfig>(`/api/admin/chatbot/config/${id}`);
  }

  toggleConfig(id: string, isActive: boolean): Observable<ChatbotConfig> {
    const params = new HttpParams().set('isActive', isActive.toString());
    return this.api.patch<ChatbotConfig>(`/api/admin/chatbot/config/${id}/toggle`, {}, params);
  }

  deleteConfig(id: string): Observable<void> {
    return this.api.delete<void>(`/api/admin/chatbot/config/${id}`);
  }

  // User endpoints
  askQuestion(request: ChatRequest): Observable<ChatResponse> {
    return this.api.post<ChatResponse>('/api/chatbot/ask', request);
  }

  getMyHistory(): Observable<ChatMessageDTO[]> {
    return this.api.get<ChatMessageDTO[]>('/api/chatbot/history/me');
  }

  getProjectHistory(requirementSetId: string): Observable<ChatMessageDTO[]> {
    return this.api.get<ChatMessageDTO[]>(
      `/api/chatbot/history/project/${requirementSetId}`
    );
  }

  getRequirementSet(): Observable<{ id: string; name: string; description?: string }> {
    return this.api.get<{ id: string; name: string; description?: string }>('/api/user/chatbot/requirement-set');
  }

  getRequirements(): Observable<Requirement[]> {
    return this.api.get<Requirement[]>('/api/user/chatbot/requirements/approved');
  }

  getSchedule(): Observable<{ startTime: string | null; endTime: string | null; available24h: boolean; showRequirementsToUsers?: boolean }> {
    return this.api.get<{ startTime: string | null; endTime: string | null; available24h: boolean; showRequirementsToUsers?: boolean }>('/api/user/chatbot/schedule');
  }

  getAvailability(): Observable<boolean> {
    return this.api.get<boolean>('/api/user/chatbot/availability');
  }
}
