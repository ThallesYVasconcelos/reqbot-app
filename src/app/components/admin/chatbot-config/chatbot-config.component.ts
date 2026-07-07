import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatbotService } from '../../../services/chatbot.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { ChatbotConfig, CreateChatbotConfigRequest } from '../../../models/chatbot.model';
import { RequirementSet } from '../../../models/requirement-set.model';

@Component({
  selector: 'app-chatbot-config',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './chatbot-config.component.html',
  styleUrl: './chatbot-config.component.css'
})
export class ChatbotConfigComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private chatbotService = inject(ChatbotService);

  workspaces = this.workspaceService.workspaces;
  selectedWorkspace = this.workspaceService.selectedWorkspace;
  selectedWorkspaceId = signal('');
  projects = signal<RequirementSet[]>([]);
  chatbots = signal<ChatbotConfig[]>([]);
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  createdAccessCode = signal<string | null>(null);

  name = signal('');
  selectedProjectId = signal('');
  startTime = signal('00:00');
  endTime = signal('23:59');
  showRequirementsToUsers = signal(true);

  breadcrumb = computed(() => {
    const workspace = this.selectedWorkspace();
    return workspace ? `Espaços / ${workspace.name}` : 'Espaços / Chatbots';
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.workspaceService.loadWorkspaces().subscribe({
      next: (list) => {
        this.loading.set(false);
        if (list.length > 0) {
          const first = this.workspaceService.selectedWorkspaceId() || list[0].id;
          this.onWorkspaceChange(first);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar espaços'));
      }
    });
  }

  onWorkspaceChange(workspaceId: string): void {
    if (!workspaceId) return;
    this.selectedWorkspaceId.set(workspaceId);
    this.workspaceService.selectWorkspace(workspaceId);
    this.error.set(null);
    this.createdAccessCode.set(null);
    this.loadProjectsForWorkspace(workspaceId);
    this.loadChatbots(workspaceId);
  }

  createChatbot(): void {
    const workspaceId = this.selectedWorkspaceId();
    if (!workspaceId) {
      this.error.set('Selecione um espaço');
      return;
    }
    if (!this.name().trim()) {
      this.error.set('Nome do chatbot é obrigatório');
      return;
    }
    if (!this.selectedProjectId()) {
      this.error.set('Selecione um projeto');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.createdAccessCode.set(null);

    const request: CreateChatbotConfigRequest = {
      name: this.name().trim(),
      requirementSetId: this.selectedProjectId(),
      startTime: this.startTime() || null,
      endTime: this.endTime() || null,
      showRequirementsToUsers: this.showRequirementsToUsers()
    };

    this.chatbotService.createWorkspaceChatbot(workspaceId, request).subscribe({
      next: (chatbot) => {
        this.saving.set(false);
        this.createdAccessCode.set(chatbot.accessCode ?? null);
        this.name.set('');
        this.loadChatbots(workspaceId);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao criar chatbot'));
      }
    });
  }

  toggleChatbot(chatbot: ChatbotConfig): void {
    const workspaceId = this.selectedWorkspaceId();
    if (!workspaceId) return;
    const nextState = !(chatbot.isActive ?? chatbot.active);
    this.chatbotService.toggleWorkspaceChatbot(workspaceId, chatbot.id, nextState).subscribe({
      next: () => this.loadChatbots(workspaceId),
      error: (err) => this.error.set(this.getUserFriendlyError(err, 'Erro ao alterar status do chatbot'))
    });
  }

  isActive(chatbot: ChatbotConfig): boolean {
    return Boolean(chatbot.isActive ?? chatbot.active);
  }

  copyAccessCode(code: string): void {
    navigator.clipboard?.writeText(code);
  }

  private loadProjectsForWorkspace(workspaceId: string): void {
    this.workspaceService.listRequirementSets(workspaceId).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        if (projects.length > 0 && !projects.some(project => project.id === this.selectedProjectId())) {
          this.selectedProjectId.set(projects[0].id);
        }
      },
      error: () => this.projects.set([])
    });
  }

  private loadChatbots(workspaceId: string): void {
    this.loading.set(true);
    this.chatbotService.getWorkspaceChatbots(workspaceId).subscribe({
      next: (chatbots) => {
        this.chatbots.set(chatbots);
        this.loading.set(false);
      },
      error: (err) => {
        this.chatbots.set([]);
        this.loading.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar chatbots'));
      }
    });
  }

  private getUserFriendlyError(err: any, fallback: string): string {
    const msg = err.error?.message;
    if (msg && typeof msg === 'string') return msg;
    if (err.message && typeof err.message === 'string') return err.message;
    return fallback;
  }
}
