import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  ChatbotConfig,
  ChatRequest,
  CreateChatbotConfigRequest,
  JoinChatbotRequest,
  WorkspaceChatResponse
} from '../models/chatbot.model';
import { ChatMessageDTO } from '../models/workspace.model';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  constructor(private api: ApiService) {}

  createWorkspaceChatbot(workspaceId: string, request: CreateChatbotConfigRequest): Observable<ChatbotConfig> {
    return this.api.post<ChatbotConfig>(`/api/workspaces/${workspaceId}/chatbots`, request);
  }

  getWorkspaceChatbots(workspaceId: string): Observable<ChatbotConfig[]> {
    return this.api.get<ChatbotConfig[]>(`/api/workspaces/${workspaceId}/chatbots`);
  }

  toggleWorkspaceChatbot(workspaceId: string, chatbotId: string, active: boolean): Observable<ChatbotConfig> {
    const params = new HttpParams().set('active', String(active));
    return this.api.patch<ChatbotConfig>(`/api/workspaces/${workspaceId}/chatbots/${chatbotId}/active`, {}, params);
  }

  getWorkspaceChatbotHistory(workspaceId: string, chatbotId: string): Observable<ChatMessageDTO[]> {
    return this.api.get<ChatMessageDTO[]>(`/api/workspaces/${workspaceId}/chatbots/${chatbotId}/history`);
  }

  joinByCode(request: JoinChatbotRequest): Observable<ChatbotConfig> {
    return this.api.post<ChatbotConfig>('/api/chatbots/join', request);
  }

  getMyChatbots(): Observable<ChatbotConfig[]> {
    return this.api.get<ChatbotConfig[]>('/api/chatbots/me');
  }

  ask(chatbotId: string, request: ChatRequest): Observable<WorkspaceChatResponse> {
    return this.api.post<WorkspaceChatResponse>(`/api/chatbots/${chatbotId}/chat/ask`, request);
  }

  getMyChatHistory(chatbotId: string): Observable<ChatMessageDTO[]> {
    return this.api.get<ChatMessageDTO[]>(`/api/chatbots/${chatbotId}/chat/history/me`);
  }

  // Compatibility wrappers while older components migrate.
  getWorkspaceActiveConfig(workspaceId: string): Observable<ChatbotConfig> {
    return new Observable<ChatbotConfig>(subscriber => {
      this.getWorkspaceChatbots(workspaceId).subscribe({
        next: chatbots => {
          const active = chatbots.find(bot => (bot.isActive ?? bot.active) && bot.availableNow !== false) ?? chatbots[0];
          if (active) {
            subscriber.next(active);
            subscriber.complete();
          } else {
            subscriber.error({ status: 404, error: { message: 'Nenhum chatbot configurado para este espaço' } });
          }
        },
        error: err => subscriber.error(err)
      });
    });
  }

  createWorkspaceConfig(workspaceId: string, request: CreateChatbotConfigRequest): Observable<ChatbotConfig> {
    return this.createWorkspaceChatbot(workspaceId, request);
  }

  getWorkspaceConfigs(workspaceId: string): Observable<ChatbotConfig[]> {
    return this.getWorkspaceChatbots(workspaceId);
  }

  askInWorkspace(workspaceId: string, request: ChatRequest): Observable<WorkspaceChatResponse> {
    return this.ask(workspaceId, request);
  }

  getMyChatHistoryInWorkspace(workspaceId: string): Observable<ChatMessageDTO[]> {
    return this.getMyChatHistory(workspaceId);
  }
}
