import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  ChatbotConfig,
  ChatbotAccessCodeResponse,
  ChatRequest,
  CreateChatbotConfigRequest,
  JoinChatbotRequest,
  WorkspaceChatResponse
} from '../models/chatbot.model';
import { ChatMessageDTO, ChatQuestionClusterDTO } from '../models/workspace.model';

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  constructor(private api: ApiService) {}

  createWorkspaceChatbot(workspaceId: string, request: CreateChatbotConfigRequest): Observable<ChatbotConfig> {
    return this.api
      .post<ChatbotConfig>(`/api/workspaces/${workspaceId}/chatbots`, request)
      .pipe(map(chatbot => this.normalizeChatbot(chatbot)));
  }

  getWorkspaceChatbots(workspaceId: string): Observable<ChatbotConfig[]> {
    return this.api
      .get<ChatbotConfig[]>(`/api/workspaces/${workspaceId}/chatbots`)
      .pipe(map(chatbots => this.normalizeChatbots(chatbots)));
  }

  getWorkspaceChatbot(workspaceId: string, chatbotId: string): Observable<ChatbotConfig> {
    return this.api
      .get<ChatbotConfig>(`/api/workspaces/${workspaceId}/chatbots/${chatbotId}`)
      .pipe(map(chatbot => this.normalizeChatbot(chatbot)));
  }

  getWorkspaceChatbotAccessCode(workspaceId: string, chatbotId: string): Observable<string | null> {
    return this.api
      .get<ChatbotAccessCodeResponse>(
        `/api/workspaces/${workspaceId}/chatbots/${chatbotId}/access-code`
      )
      .pipe(
        map(response => {
          const accessCode = this.firstText(
            response?.accessCode,
            response?.access_code,
            response?.code,
            response?.inviteCode
          );
          return accessCode || null;
        })
      );
  }

  toggleWorkspaceChatbot(workspaceId: string, chatbotId: string, active: boolean): Observable<ChatbotConfig> {
    const params = new HttpParams().set('active', String(active));
    return this.api
      .patch<ChatbotConfig>(`/api/workspaces/${workspaceId}/chatbots/${chatbotId}/active`, {}, params)
      .pipe(map(chatbot => this.normalizeChatbot(chatbot)));
  }

  deleteWorkspaceChatbot(workspaceId: string, chatbotId: string): Observable<void> {
    return this.api.delete<void>(`/api/workspaces/${workspaceId}/chatbots/${chatbotId}`);
  }

  getWorkspaceChatbotHistory(workspaceId: string, chatbotId: string): Observable<ChatMessageDTO[]> {
    return this.api.get<ChatMessageDTO[]>(`/api/workspaces/${workspaceId}/chatbots/${chatbotId}/history`);
  }

  getWorkspaceChatbotQuestionRanking(
    workspaceId: string,
    chatbotId: string,
    limit: number,
    similarityThreshold: number
  ): Observable<ChatQuestionClusterDTO[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('similarityThreshold', similarityThreshold);

    return this.api.get<ChatQuestionClusterDTO[]>(
      `/api/workspaces/${workspaceId}/chatbots/${chatbotId}/question-ranking`,
      params
    );
  }

  joinByCode(request: JoinChatbotRequest): Observable<ChatbotConfig> {
    return this.api
      .post<ChatbotConfig>('/api/chatbots/join', request)
      .pipe(map(chatbot => this.normalizeChatbot(chatbot)));
  }

  getMyChatbots(): Observable<ChatbotConfig[]> {
    return this.api
      .get<ChatbotConfig[]>('/api/chatbots/me')
      .pipe(map(chatbots => this.normalizeChatbots(chatbots)));
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
            subscriber.error({ status: 404, error: { message: 'Nenhum chatbot configurado para este ambiente' } });
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

  private normalizeChatbots(chatbots: ChatbotConfig[] | null | undefined): ChatbotConfig[] {
    return (chatbots ?? [])
      .map(chatbot => this.normalizeChatbot(chatbot))
      .filter(chatbot => Boolean(chatbot.id));
  }

  private normalizeChatbot(chatbot: ChatbotConfig | any): ChatbotConfig {
    const id = chatbot?.id ?? chatbot?.chatbotId ?? chatbot?.chatbot_id ?? '';
    const requirementSetName =
      chatbot?.requirementSetName ?? chatbot?.projectName ?? chatbot?.requirement_set_name;
    const name = this.firstText(
      chatbot?.name,
      chatbot?.chatbotName,
      chatbot?.displayName,
      chatbot?.botName,
      chatbot?.assistantName,
      chatbot?.configName,
      chatbot?.configurationName,
      chatbot?.title,
      chatbot?.chatbot?.name
    );
    const accessCode = this.firstText(
      chatbot?.accessCode,
      chatbot?.code,
      chatbot?.access_code,
      chatbot?.inviteCode
    );

    return {
      ...chatbot,
      id,
      name: name || 'Chatbot sem nome',
      isActive: chatbot?.isActive ?? chatbot?.active ?? chatbot?.enabled ?? false,
      active: chatbot?.active ?? chatbot?.isActive ?? chatbot?.enabled ?? false,
      accessCode: accessCode || undefined,
      requirementSetId: chatbot?.requirementSetId ?? chatbot?.projectId ?? chatbot?.requirement_set_id ?? '',
      requirementSetName,
      availableNow: chatbot?.availableNow ?? chatbot?.isAvailable,
      isAvailable: chatbot?.isAvailable ?? chatbot?.availableNow
    };
  }

  private firstText(...values: unknown[]): string {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return '';
  }
}
