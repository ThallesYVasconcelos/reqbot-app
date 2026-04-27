import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ChatbotConfig,
  CreateChatbotConfigRequest,
  WorkspaceChatResponse,
  ChatRequest
} from '../models/chatbot.model';
import { ChatMessageDTO } from '../models/workspace.model';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  constructor(private api: ApiService) {}

  // --- Config global (legada, admin) ---
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

  // --- Config por workspace ---
  getWorkspaceActiveConfig(workspaceId: string): Observable<ChatbotConfig> {
    return this.api.get<ChatbotConfig>(`/api/workspaces/${workspaceId}/chatbot/config/active`);
  }

  createWorkspaceConfig(workspaceId: string, request: CreateChatbotConfigRequest): Observable<ChatbotConfig> {
    return this.api.post<ChatbotConfig>(`/api/workspaces/${workspaceId}/chatbot/config`, request);
  }

  getWorkspaceConfigs(workspaceId: string): Observable<ChatbotConfig[]> {
    return this.api.get<ChatbotConfig[]>(`/api/workspaces/${workspaceId}/chatbot/config`);
  }

  // --- Chat por workspace ---
  askInWorkspace(workspaceId: string, request: ChatRequest): Observable<WorkspaceChatResponse> {
    return this.api.post<WorkspaceChatResponse>(`/api/workspaces/${workspaceId}/chat/ask`, request);
  }

  getMyChatHistoryInWorkspace(workspaceId: string): Observable<ChatMessageDTO[]> {
    return this.api.get<ChatMessageDTO[]>(`/api/workspaces/${workspaceId}/chat/history/me`);
  }
}
