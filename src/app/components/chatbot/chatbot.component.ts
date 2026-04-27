import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ChatbotService } from '../../services/chatbot.service';
import { WorkspaceService } from '../../services/workspace.service';
import { AuthService } from '../../services/auth.service';
import { RequirementSetService } from '../../services/requirement-set.service';
import { ChatRequest } from '../../models/chatbot.model';
import { ChatbotConfig } from '../../models/chatbot.model';
import { Requirement } from '../../models/requirement.model';
import { WorkspaceDTO } from '../../models/workspace.model';

interface Message {
  question: string;
  answer: string;
  timestamp: string;
  isUser: boolean;
}

interface ChatSession {
  workspaceId: string;
  workspaceName: string;
  messages: Message[];
}

const STORAGE_KEY_PREFIX = 'chatbot_ws_sessions_';
const MAX_NAME_LENGTH = 28;

function utcTimeToLocal(timeStr: string | null | undefined): string {
  if (!timeStr || !timeStr.trim()) return timeStr ?? '';
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  const s = parseInt(parts[2] || '0', 10);
  const utcDate = new Date(Date.UTC(2000, 0, 1, h, m, s));
  return utcDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function toLocalTimestamp(ts: string | null | undefined): string {
  if (!ts || !ts.trim()) return ts ?? '';
  const s = ts.trim();
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) return s;
  return s + (s.includes('T') ? 'Z' : '');
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnInit {
  sessions = signal<ChatSession[]>([]);
  activeSessionId = signal<string>('');
  currentQuestion = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  isAvailable = signal(false);
  requirementSetName = signal<string>('');
  activeRequirementSetId = signal<string>('');
  activeWorkspace = signal<WorkspaceDTO | null>(null);
  activeConfig = signal<ChatbotConfig | null>(null);
  approvedRequirements = signal<Requirement[]>([]);
  approvedByWorkspace = signal<Record<string, Requirement[]>>({});
  showRequirementsModal = signal(false);
  showMenu = signal(true);
  scheduleText = signal<string>('');
  showRequirementsToUsers = signal(false);
  projectDescription = signal<string>('');
  bootLoading = signal(true);

  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private chatbotService = inject(ChatbotService);
  private workspaceService = inject(WorkspaceService);
  public authService = inject(AuthService);
  private requirementSetService = inject(RequirementSetService);

  viewAsUser = toSignal(
    this.route.queryParams.pipe(map(p => p['viewAsUser'] === 'true')),
    { initialValue: false }
  );

  /** Lista de workspaces do utilizador (para trocar de "sala") */
  workspaces = this.workspaceService.workspaces;

  messages = computed(() => {
    const sid = this.activeSessionId();
    const session = this.sessions().find(s => s.workspaceId === sid);
    return session?.messages ?? [];
  });

  truncateName(name: string): string {
    if (name.length <= MAX_NAME_LENGTH) return name;
    return name.slice(0, MAX_NAME_LENGTH - 3) + '...';
  }

  toLocalTimestamp = toLocalTimestamp;

  private getStorageKey(): string {
    const email = this.authService.user()?.email ?? 'user';
    return `${STORAGE_KEY_PREFIX}${email}`;
  }

  private loadSessionsFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const key = this.getStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as ChatSession[];
        if (Array.isArray(parsed) && parsed.length > 0 && 'workspaceId' in (parsed[0] as any)) {
          this.sessions.set(parsed);
        }
      }
    } catch {
      /* ignora */
    }
  }

  private saveSessionsToStorage(sessions?: ChatSession[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const toSave = sessions ?? this.sessions();
      localStorage.setItem(this.getStorageKey(), JSON.stringify(toSave));
    } catch {
      /* quota */
    }
  }

  ngOnInit(): void {
    this.loadSessionsFromStorage();
    this.bootLoading.set(true);
    this.error.set(null);

    this.workspaceService.loadWorkspaces().subscribe({
      next: (list) => {
        this.bootLoading.set(false);
        if (list.length === 0) {
          this.error.set('Nenhum workspace. Entre com um código de convite ou peça acesso a um administrador.');
          this.isAvailable.set(false);
          return;
        }
        const wid = this.workspaceService.selectedWorkspaceId() || list[0].id;
        this.workspaceService.selectWorkspace(wid);
        this.selectSession(wid, list);
      },
      error: (err) => {
        this.bootLoading.set(false);
        this.error.set(err.error?.message || 'Erro ao carregar workspaces');
      }
    });
  }

  private selectSession(workspaceId: string, workspaceList: WorkspaceDTO[]): void {
    const w = workspaceList.find(x => x.id === workspaceId) ?? workspaceList[0];
    this.activeSessionId.set(w.id);
    this.activeWorkspace.set(w);
    this.ensureSessionExists(w.id, w.name);
    this.loadChatbotInfoForWorkspace(w.id);
  }

  selectWorkspaceFromSidebar(workspaceId: string): void {
    this.workspaceService.selectWorkspace(workspaceId);
    const w = this.workspaces().find(x => x.id === workspaceId);
    if (w) {
      this.activeWorkspace.set(w);
    }
    this.activeSessionId.set(workspaceId);
    this.ensureSessionExists(workspaceId, w?.name ?? 'Workspace');
    const cached = this.approvedByWorkspace()[workspaceId];
    this.approvedRequirements.set(cached ?? []);
    this.loadChatbotInfoForWorkspace(workspaceId);
  }

  private ensureSessionExists(workspaceId: string, name: string): void {
    const sessions = this.sessions();
    if (!sessions.some(s => s.workspaceId === workspaceId)) {
      const updated = [...sessions, { workspaceId, workspaceName: name, messages: [] }];
      this.sessions.set(updated);
      this.saveSessionsToStorage(updated);
    } else {
      const cur = sessions.find(s => s.workspaceId === workspaceId);
      if (cur && cur.workspaceName !== name) {
        const updated = sessions.map(s =>
          s.workspaceId === workspaceId ? { ...s, workspaceName: name } : s
        );
        this.sessions.set(updated);
        this.saveSessionsToStorage(updated);
      }
    }
  }

  private loadChatbotInfoForWorkspace(workspaceId: string): void {
    this.error.set(null);
    this.chatbotService.getWorkspaceActiveConfig(workspaceId).subscribe({
      next: (config) => {
        this.activeConfig.set(config);
        this.isAvailable.set(config.availableNow !== false);
        this.showRequirementsToUsers.set(config.showRequirementsToUsers ?? false);
        this.activeRequirementSetId.set(config.requirementSetId);
        this.requirementSetName.set(config.requirementSetName);
        this.projectDescription.set('');

        if (config.startTime && config.endTime) {
          const a = (config.startTime || '').slice(0, 5);
          const b = (config.endTime || '').slice(0, 5);
          this.scheduleText.set(`Horário: ${utcTimeToLocal(a)} às ${utcTimeToLocal(b)}`);
        } else {
          this.scheduleText.set('Disponível 24h');
        }

        this.requirementSetService.getById(config.requirementSetId).subscribe({
          next: (set) => {
            this.projectDescription.set(set.description || '');
            this.requirementSetName.set(set.name);
          },
          error: () => {}
        });

        this.loadApprovedForWorkspace(workspaceId, config.requirementSetId);
        if (this.error()?.includes('não está configurado')) {
          this.error.set(null);
        }
      },
      error: (err) => {
        this.activeConfig.set(null);
        this.isAvailable.set(false);
        if (err.status === 404) {
          this.error.set('Chatbot deste workspace não está configurado ou está inativo.');
        } else {
          this.error.set(err.error?.message || 'Erro ao carregar configuração do chatbot');
        }
      }
    });
  }

  private loadApprovedForWorkspace(workspaceId: string, requirementSetId: string): void {
    this.requirementSetService.getRequirements(requirementSetId).subscribe({
      next: (requirements) => {
        this.approvedByWorkspace.update(m => ({ ...m, [workspaceId]: requirements }));
        if (this.activeSessionId() === workspaceId) {
          this.approvedRequirements.set(requirements);
        }
      },
      error: () => {
        this.approvedByWorkspace.update(m => ({ ...m, [workspaceId]: [] }));
        this.approvedRequirements.set([]);
      }
    });
  }

  private updateSessionMessages(workspaceId: string, updater: (msgs: Message[]) => Message[]): void {
    this.sessions.update(ss => {
      const updated = ss.map(s => {
        if (s.workspaceId !== workspaceId) return s;
        return { ...s, messages: updater(s.messages) };
      });
      this.saveSessionsToStorage(updated);
      return updated;
    });
  }

  canShowRequirements(): boolean {
    if (this.viewAsUser()) {
      return this.showRequirementsToUsers();
    }
    return this.authService.isAdmin() || this.showRequirementsToUsers();
  }

  canSendMessage(): boolean {
    return (
      !!this.activeSessionId() &&
      this.activeConfig() !== null &&
      this.isAvailable() &&
      this.activeConfig()!.isActive
    );
  }

  sendMessage(): void {
    if (!this.currentQuestion().trim() || this.loading()) {
      return;
    }
    const workspaceId = this.activeSessionId();
    if (!this.canSendMessage()) {
      this.error.set('Chatbot indisponível no momento ou inativo para este workspace.');
      return;
    }

    if (!this.isAvailable()) {
      this.error.set('Desculpe, o Reqbot está fora do horário de funcionamento.');
      return;
    }

    const question = this.currentQuestion().trim();
    this.currentQuestion.set('');
    this.loading.set(true);
    this.error.set(null);

    this.updateSessionMessages(workspaceId, msgs => [
      ...msgs,
      { question, answer: '', timestamp: new Date().toISOString(), isUser: true }
    ]);

    const request: ChatRequest = { question };
    this.chatbotService.askInWorkspace(workspaceId, request).subscribe({
      next: (response) => {
        this.isAvailable.set(response.chatbotAvailable);
        if (!response.chatbotAvailable) {
          this.error.set('Desculpe, o Reqbot está fora do horário de funcionamento.');
          this.updateSessionMessages(workspaceId, msgs => msgs.slice(0, -1));
        } else {
          let answer = response.answer;
          if (!answer || !answer.trim()) {
            answer = 'Desculpe, não consegui processar sua pergunta. Por favor, tente novamente.';
          }
          if (this.error()?.includes('fora do horário')) {
            this.error.set(null);
          }
          const ts = response.answeredAt || new Date().toISOString();
          this.updateSessionMessages(workspaceId, msgs => [
            ...msgs,
            {
              question: response.question || question,
              answer,
              timestamp: ts,
              isUser: false
            }
          ]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.updateSessionMessages(workspaceId, msgs => msgs.slice(0, -1));
        if (err.status === 400) {
          this.error.set(err.error?.message || 'Reqbot não está disponível no momento');
        } else if (err.status === 404) {
          this.error.set('Chatbot não está configurado para este workspace');
        } else {
          this.error.set(err.error?.message || 'Erro ao enviar mensagem');
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }

  goToWorkspaces(): void {
    this.router.navigate(this.authService.isAdmin() ? ['/admin/workspaces'] : ['/workspaces']);
  }

  toggleRequirementsModal(): void {
    this.showRequirementsModal.update(v => !v);
  }

  closeRequirementsModal(): void {
    this.showRequirementsModal.set(false);
  }

  toggleMenu(): void {
    this.showMenu.update(val => !val);
  }
}
