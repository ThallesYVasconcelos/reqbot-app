import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatbotService } from '../../../services/chatbot.service';
import { RequirementSetService } from '../../../services/requirement-set.service';
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
  activeConfig = signal<ChatbotConfig | null>(null);
  projects = signal<RequirementSet[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  selectedProjectId = signal<string>('');
  startTime = signal<string>('');
  endTime = signal<string>('');
  isActive = signal(true);
  showRequirementsToUsers = signal(false);

  constructor(
    private chatbotService: ChatbotService,
    private projectService: RequirementSetService
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.loadActiveConfig();
  }

  loadProjects(): void {
    this.projectService.getAll().subscribe({
      next: (projects) => this.projects.set(projects),
      error: () => {}
    });
  }

  loadActiveConfig(): void {
    this.loading.set(true);
    this.chatbotService.getActiveConfig().subscribe({
      next: (config) => {
        this.activeConfig.set(config);
        this.selectedProjectId.set(config.requirementSetId);
        this.startTime.set(config.startTime || '');
        this.endTime.set(config.endTime || '');
        this.isActive.set(config.isActive);
        this.showRequirementsToUsers.set(config.showRequirementsToUsers ?? false);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.activeConfig.set(null);
        } else {
          this.error.set(err.error?.message || 'Erro ao carregar configuração');
        }
        this.loading.set(false);
      }
    });
  }

  saveConfig(): void {
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

    this.chatbotService.createConfig(request).subscribe({
      next: (config) => {
        this.activeConfig.set(config);
        this.selectedProjectId.set(config.requirementSetId);
        this.startTime.set(config.startTime || '');
        this.endTime.set(config.endTime || '');
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

  toggleActive(): void {
    const config = this.activeConfig();
    if (!config) {
      this.error.set('Nenhuma configuração encontrada');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    
    this.chatbotService.toggleConfig(config.id, !config.isActive).subscribe({
      next: (updatedConfig) => {
        this.activeConfig.set(updatedConfig);
        this.isActive.set(updatedConfig.isActive);
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err) => {
        this.error.set(err.error?.message || err.message || 'Erro ao alterar status');
        this.loading.set(false);
      }
    });
  }
}
