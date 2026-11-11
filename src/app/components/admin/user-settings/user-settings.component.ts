import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ThemeService } from '../../../services/theme.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { AiConfigurationService } from '../../../services/ai-configuration.service';
import { AiConfiguration, AiModelOption, AiProvider } from '../../../models/ai-configuration.model';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-settings.component.html'
})
export class UserSettingsComponent implements OnInit {
  readonly authService = inject(AuthService);
  readonly themeService = inject(ThemeService);
  private workspaceService = inject(WorkspaceService);
  private aiService = inject(AiConfigurationService);

  readonly selectedWorkspace = this.workspaceService.selectedWorkspace;
  readonly isOwner = computed(() => {
    const workspace = this.selectedWorkspace();
    const email = this.authService.user()?.email?.toLowerCase();
    return !!workspace && !!email && workspace.ownerEmail.toLowerCase() === email;
  });
  aiConfiguration = signal<AiConfiguration | null>(null);
  aiModels = signal<AiModelOption[]>([]);
  aiProvider = signal<AiProvider>('GEMINI');
  aiModel = signal('');
  aiApiKey = signal('');
  aiLoading = signal(false);
  aiSaving = signal(false);
  aiMessage = signal<string | null>(null);
  aiError = signal<string | null>(null);

  ngOnInit(): void {
    this.workspaceService.loadWorkspaces().subscribe(() => this.loadAiConfiguration());
  }

  private loadAiConfiguration(): void {
    const workspace = this.selectedWorkspace();
    if (!workspace || !this.isOwner()) return;
    this.aiLoading.set(true);
    forkJoin({
      configuration: this.aiService.get(workspace.id),
      models: this.aiService.models(workspace.id)
    }).subscribe({
      next: ({ configuration, models }) => {
        this.aiConfiguration.set(configuration);
        this.aiModels.set(models);
        if (configuration) {
          this.aiProvider.set(configuration.provider);
          this.aiModel.set(configuration.model);
        }
        this.aiLoading.set(false);
      },
      error: () => {
        this.aiLoading.set(false);
        this.aiError.set('Não foi possível carregar a configuração de IA.');
      }
    });
  }

  saveAiConfiguration(): void {
    const workspace = this.selectedWorkspace();
    if (!workspace || !this.aiModel().trim() || !this.aiApiKey().trim()) {
      this.aiError.set('Informe o provedor, modelo e chave de API.');
      return;
    }
    this.aiSaving.set(true);
    this.aiError.set(null);
    this.aiService.save(workspace.id, {
      provider: this.aiProvider(), model: this.aiModel().trim(), apiKey: this.aiApiKey().trim()
    }).subscribe({
      next: configuration => {
        this.aiConfiguration.set(configuration);
        this.aiApiKey.set('');
        this.aiSaving.set(false);
        this.aiMessage.set('Configuração salva com segurança.');
      },
      error: () => {
        this.aiSaving.set(false);
        this.aiError.set('Não foi possível salvar a configuração de IA.');
      }
    });
  }

  removeAiConfiguration(): void {
    const workspace = this.selectedWorkspace();
    if (!workspace) return;
    this.aiSaving.set(true);
    this.aiService.remove(workspace.id).subscribe({
      next: () => {
        this.aiConfiguration.set(null);
        this.aiApiKey.set('');
        this.aiSaving.set(false);
        this.aiMessage.set('Configuração removida.');
      },
      error: () => {
        this.aiSaving.set(false);
        this.aiError.set('Não foi possível remover a configuração.');
      }
    });
  }
}
