import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatbotService } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';
import { ChatResponse, ChatRequest } from '../../models/chatbot.model';
import { Requirement } from '../../models/requirement.model';

interface Message {
  question: string;
  answer: string;
  timestamp: string;
  isUser: boolean;
}

interface ChatSession {
  projectId: string;
  projectName: string;
  messages: Message[];
}

const STORAGE_KEY_PREFIX = 'chatbot_sessions_';
const MAX_PROJECT_NAME_LENGTH = 25;

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
  approvedRequirements = signal<Requirement[]>([]);
  approvedByProject = signal<Record<string, Requirement[]>>({});
  showRequirementsModal = signal(false);
  showMenu = signal(true);
  scheduleText = signal<string>('');
  showRequirementsToUsers = signal(false);
  projectDescription = signal<string>('');

  private platformId = inject(PLATFORM_ID);

  constructor(
    private chatbotService: ChatbotService,
    public authService: AuthService
  ) {}

  messages = computed(() => {
    const sid = this.activeSessionId();
    const session = this.sessions().find(s => s.projectId === sid);
    return session?.messages ?? [];
  });

  truncateProjectName(name: string): string {
    if (name.length <= MAX_PROJECT_NAME_LENGTH) return name;
    return name.slice(0, MAX_PROJECT_NAME_LENGTH - 3) + '...';
  }

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
        if (Array.isArray(parsed)) {
          this.sessions.set(parsed);
        }
      }
    } catch {
      // Migração do formato antigo
      const oldKey = `chatbot_messages_${this.authService.user()?.email ?? 'user'}`;
      const oldStored = localStorage.getItem(oldKey);
      if (oldStored) {
        try {
          const oldMsgs = JSON.parse(oldStored) as Message[];
          if (Array.isArray(oldMsgs) && oldMsgs.length > 0) {
            const legacy: ChatSession = {
              projectId: 'legacy',
              projectName: 'Conversa anterior',
              messages: oldMsgs
            };
            this.sessions.set([legacy]);
            this.activeSessionId.set('legacy');
            this.saveSessionsToStorage([legacy]);
            localStorage.removeItem(oldKey);
          }
        } catch {}
      }
    }
  }

  private saveSessionsToStorage(sessions?: ChatSession[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const key = this.getStorageKey();
      const toSave = sessions ?? this.sessions();
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch {
      // Ignora erros de quota
    }
  }

  ngOnInit(): void {
    this.loadSessionsFromStorage();
    this.loadChatbotInfo();
    this.checkAvailability();
  }

  loadChatbotInfo(): void {
    this.chatbotService.getRequirementSet().subscribe({
      next: (set) => {
        this.requirementSetName.set(set.name);
        this.activeRequirementSetId.set(set.id);
        this.projectDescription.set(set.description ?? '');
        this.ensureSessionExists(set.id, set.name);
        this.activeSessionId.set(set.id);
        this.loadApprovedRequirements();
        this.loadSchedule();
      },
      error: (err) => {
        if (err.status === 404) {
          this.error.set('Reqbot não está configurado ou está inativo');
          this.isAvailable.set(false);
        } else {
          this.error.set(err.error?.message || 'Erro ao carregar informações do chatbot');
        }
      }
    });
  }

  private ensureSessionExists(projectId: string, projectName: string): void {
    const sessions = this.sessions();
    if (!sessions.some(s => s.projectId === projectId)) {
      const updated = [...sessions, { projectId, projectName, messages: [] }];
      this.sessions.set(updated);
      this.saveSessionsToStorage(updated);
    } else {
      const existing = sessions.find(s => s.projectId === projectId);
      if (existing && existing.projectName !== projectName) {
        const updated = sessions.map(s =>
          s.projectId === projectId ? { ...s, projectName } : s
        );
        this.sessions.set(updated);
        this.saveSessionsToStorage(updated);
      }
    }
  }

  selectSession(projectId: string): void {
    this.activeSessionId.set(projectId);
    const cached = this.approvedByProject()[projectId];
    this.approvedRequirements.set(cached ?? []);
  }

  private updateSessionMessages(projectId: string, updater: (msgs: Message[]) => Message[]): void {
    this.sessions.update(ss => {
      const updated = ss.map(s => {
        if (s.projectId !== projectId) return s;
        return { ...s, messages: updater(s.messages) };
      });
      this.saveSessionsToStorage(updated);
      return updated;
    });
  }

  checkAvailability(): void {
    this.chatbotService.getAvailability().subscribe({
      next: (available) => {
        this.isAvailable.set(available);
        if (!available) {
          this.error.set('Desculpe, o Reqbot está fora do horário de funcionamento.');
        } else {
          // Limpa o erro se estiver disponível
          if (this.error()?.includes('fora do horário')) {
            this.error.set(null);
          }
        }
      },
      error: (err) => {
        this.isAvailable.set(false);
        if (err.status === 404) {
          this.error.set('Reqbot não está configurado ou está inativo');
        }
      }
    });
  }

  loadApprovedRequirements(): void {
    const projectId = this.activeRequirementSetId();
    this.chatbotService.getRequirements().subscribe({
      next: (requirements) => {
        this.approvedByProject.update(m => ({ ...m, [projectId]: requirements }));
        if (this.activeSessionId() === projectId) {
          this.approvedRequirements.set(requirements);
        }
      },
      error: () => {}
    });
  }

  loadSchedule(): void {
    this.chatbotService.getSchedule().subscribe({
      next: (s) => {
        this.showRequirementsToUsers.set(s.showRequirementsToUsers ?? false);
        if (s.available24h) {
          this.scheduleText.set('Disponível 24h');
        } else if (s.startTime && s.endTime) {
          this.scheduleText.set('Horário: ' + s.startTime + ' às ' + s.endTime);
        } else {
          this.scheduleText.set('');
        }
      },
      error: () => this.scheduleText.set('')
    });
  }

  canShowRequirements(): boolean {
    return this.authService.isAdmin() || this.showRequirementsToUsers();
  }

  canSendMessage(): boolean {
    return this.activeSessionId() === this.activeRequirementSetId();
  }

  sendMessage(): void {
    if (!this.currentQuestion().trim() || this.loading()) {
      return;
    }
    if (!this.canSendMessage()) {
      this.error.set('É possível enviar mensagens apenas no chatbot do projeto ativo.');
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

    const projectId = this.activeSessionId();
    this.updateSessionMessages(projectId, msgs => [...msgs, {
      question,
      answer: '',
      timestamp: new Date().toISOString(),
      isUser: true
    }]);

    const request: ChatRequest = { question };

    this.chatbotService.askQuestion(request).subscribe({
      next: (response: ChatResponse) => {
        this.isAvailable.set(response.isAvailable ?? true);

        if (!response.isAvailable) {
          this.error.set('Desculpe, o Reqbot está fora do horário de funcionamento.');
          this.updateSessionMessages(projectId, msgs => msgs.slice(0, -1));
        } else {
          if (!response.answer || response.answer.trim() === '') {
            response.answer = 'Desculpe, não consegui processar sua pergunta. Por favor, tente novamente.';
          }
          if (this.error()?.includes('fora do horário')) {
            this.error.set(null);
          }
          this.updateSessionMessages(projectId, msgs => [...msgs, {
            question: response.question || question,
            answer: response.answer,
            timestamp: response.timestamp || new Date().toISOString(),
            isUser: false
          }]);
        }
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.updateSessionMessages(projectId, msgs => msgs.slice(0, -1));
        
        if (err.status === 400) {
          this.error.set(err.error?.message || 'Reqbot não está disponível no momento');
          this.isAvailable.set(false);
        } else if (err.status === 404) {
          this.error.set('Chatbot não está configurado ou está inativo');
          this.isAvailable.set(false);
        } else {
          this.error.set(err.error?.message || 'Erro ao enviar mensagem');
        }
      }
    });
  }

  logout(): void {
    this.authService.logout();
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
