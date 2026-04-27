import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../../services/chatbot.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { ChatbotConfig, CreateChatbotConfigRequest } from '../../../models/chatbot.model';
import { RequirementSet } from '../../../models/requirement-set.model';

@Component({
  selector: 'app-chatbot-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot-config.component.html',
  styleUrl: './chatbot-config.component.css'
})
export class ChatbotConfigComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private chatbotService = inject(ChatbotService);

  workspaces = this.workspaceService.workspaces;
  activeConfig = signal<ChatbotConfig | null>(null);
  projects = signal<RequirementSet[]>([]);
  selectedWorkspaceId = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);

  selectedProjectId = signal<string>('');
  startTime = signal<string>('');
  endTime = signal<string>('');
  isActive = signal(true);
  showRequirementsToUsers = signal(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.workspaceService.loadWorkspaces().subscribe({
      next: (list) => {
        this.loading.set(false);
        if (list.length > 0) {
          const first = this.workspaceService.selectedWorkspaceId() || list[0].id;
          this.selectedWorkspaceId.set(first);
          this.workspaceService.selectWorkspace(first);
          this.onWorkspaceChange(first);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  onWorkspaceChange(workspaceId: string): void {
    if (!workspaceId) return;
    this.selectedWorkspaceId.set(workspaceId);
    this.workspaceService.selectWorkspace(workspaceId);
    this.error.set(null);
    this.loadProjectsForWorkspace(workspaceId);
    this.loadActiveConfigForWorkspace(workspaceId);
  }

  private loadProjectsForWorkspace(workspaceId: string): void {
    this.workspaceService.listRequirementSets(workspaceId).subscribe({
      next: (projects) => this.projects.set(projects),
      error: () => this.projects.set([])
    });
  }

  loadActiveConfigForWorkspace(workspaceId: string): void {
    this.loading.set(true);
    this.chatbotService.getWorkspaceActiveConfig(workspaceId).subscribe({
      next: (config) => {
        this.activeConfig.set(config);
        this.selectedProjectId.set(config.requirementSetId);
        this.startTime.set((config.startTime || '').slice(0, 5));
        this.endTime.set((config.endTime || '').slice(0, 5));
        this.isActive.set(config.isActive);
        this.showRequirementsToUsers.set(config.showRequirementsToUsers ?? false);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.activeConfig.set(null);
        } else {
          this.error.set(err.error?.message || 'Erro ao carregar configuração do workspace');
        }
        this.loading.set(false);
      }
    });
  }

  saveConfig(): void {
    const workspaceId = this.selectedWorkspaceId();
    if (!workspaceId) {
      this.error.set('Selecione um workspace');
      return;
    }
    if (!this.selectedProjectId()) {
      this.error.set('Selecione um projeto');
      return;
    }

    this.loading.set(true);
    const request: CreateChatbotConfigRequest = {
      requirementSetId: this.selectedProjectId(),
      startTime: this.startTime() || null,
      endTime: this.endTime() || null,
      isActive: this.isActive(),
      showRequirementsToUsers: this.showRequirementsToUsers()
    };

    this.chatbotService.createWorkspaceConfig(workspaceId, request).subscribe({
      next: (config) => {
        this.activeConfig.set(config);
        this.selectedProjectId.set(config.requirementSetId);
        this.startTime.set((config.startTime || '').slice(0, 5));
        this.endTime.set((config.endTime || '').slice(0, 5));
        this.isActive.set(config.isActive);
        this.showRequirementsToUsers.set(config.showRequirementsToUsers ?? false);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Erro ao salvar configuração');
        this.loading.set(false);
      }
    });
  }
}
