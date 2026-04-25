import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WorkspaceService } from '../../services/workspace.service';
import { ConfirmModalComponent } from '../shared/confirm-modal/confirm-modal.component';
import {
  AddWorkspaceMemberRequest,
  ChatMessageDTO,
  ChatQuestionClusterDTO,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceDTO,
  WorkspaceRole,
  WorkspaceType
} from '../../models/workspace.model';

type WorkspaceForm = {
  name: string;
  description: string;
  type: WorkspaceType;
};

@Component({
  selector: 'app-workspaces',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmModalComponent],
  templateUrl: './workspaces.component.html',
  styleUrl: './workspaces.component.css'
})
export class WorkspacesComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  readonly authService = inject(AuthService);

  workspaces = this.workspaceService.workspaces;
  selectedWorkspaceId = this.workspaceService.selectedWorkspaceId;
  selectedWorkspace = this.workspaceService.selectedWorkspace;

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  analyticsError = signal<string | null>(null);
  activeTab = signal<'details' | 'history' | 'ranking'>('details');

  showWorkspaceModal = signal(false);
  editingWorkspace = signal<WorkspaceDTO | null>(null);
  workspaceForm = signal<WorkspaceForm>({
    name: '',
    description: '',
    type: 'PROFESSIONAL'
  });

  showDeleteModal = signal(false);
  deleteTarget = signal<WorkspaceDTO | null>(null);

  memberEmail = signal('');
  memberRole = signal<Exclude<WorkspaceRole, 'OWNER'>>('MEMBER');
  memberSaving = signal(false);

  history = signal<ChatMessageDTO[]>([]);
  ranking = signal<ChatQuestionClusterDTO[]>([]);
  analyticsLoading = signal(false);
  rankingLimit = signal(10);
  similarityThreshold = signal(0.82);
  expandedRank = signal<number | null>(null);

  userWorkspaceRole = computed<WorkspaceRole | null>(() => {
    const workspace = this.selectedWorkspace();
    const email = this.authService.user()?.email?.toLowerCase();
    if (!workspace || !email) return null;
    if (workspace.ownerEmail.toLowerCase() === email) return 'OWNER';
    return workspace.members.find(member => member.userEmail.toLowerCase() === email)?.role ?? null;
  });

  canEditWorkspace = computed(() => {
    const role = this.userWorkspaceRole();
    return role === 'OWNER' || role === 'ADMIN';
  });

  canDeleteWorkspace = computed(() => this.userWorkspaceRole() === 'OWNER');
  canManageMembers = computed(() => {
    const role = this.userWorkspaceRole();
    return role === 'OWNER' || role === 'ADMIN';
  });
  canViewAnalytics = computed(() => this.canManageMembers());

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.loading.set(true);
    this.error.set(null);

    this.workspaceService.loadWorkspaces().subscribe({
      next: (workspaces) => {
        this.loading.set(false);
        if (workspaces.length > 0) {
          this.selectWorkspace(this.selectedWorkspaceId() ?? workspaces[0].id);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar workspaces'));
      }
    });
  }

  selectWorkspace(id: string): void {
    this.workspaceService.selectWorkspace(id);
    this.analyticsError.set(null);
    this.history.set([]);
    this.ranking.set([]);

    if (this.canViewAnalytics()) {
      this.loadHistory();
      this.loadRanking();
    }
  }

  openCreateWorkspaceModal(): void {
    this.editingWorkspace.set(null);
    this.workspaceForm.set({ name: '', description: '', type: 'PROFESSIONAL' });
    this.error.set(null);
    this.showWorkspaceModal.set(true);
  }

  openEditWorkspaceModal(workspace: WorkspaceDTO): void {
    this.editingWorkspace.set(workspace);
    this.workspaceForm.set({
      name: workspace.name,
      description: workspace.description ?? '',
      type: workspace.type
    });
    this.error.set(null);
    this.showWorkspaceModal.set(true);
  }

  closeWorkspaceModal(): void {
    this.showWorkspaceModal.set(false);
    this.editingWorkspace.set(null);
    this.workspaceForm.set({ name: '', description: '', type: 'PROFESSIONAL' });
    this.error.set(null);
  }

  updateWorkspaceForm(field: keyof WorkspaceForm, value: string): void {
    this.workspaceForm.update(form => ({ ...form, [field]: value }));
  }

  saveWorkspace(): void {
    const form = this.workspaceForm();
    if (!form.name.trim()) {
      this.error.set('Nome do workspace é obrigatório');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const request: CreateWorkspaceRequest | UpdateWorkspaceRequest = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      type: form.type
    };
    const editing = this.editingWorkspace();
    const operation = editing
      ? this.workspaceService.update(editing.id, request)
      : this.workspaceService.create(request);

    operation.subscribe({
      next: (workspace) => {
        this.saving.set(false);
        this.closeWorkspaceModal();
        this.selectWorkspace(workspace.id);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao salvar workspace'));
      }
    });
  }

  openDeleteWorkspaceModal(workspace: WorkspaceDTO): void {
    this.deleteTarget.set(workspace);
    this.showDeleteModal.set(true);
  }

  closeDeleteWorkspaceModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  getDeleteConfirmMessage(): string {
    const target = this.deleteTarget();
    return target ? `Tem certeza que deseja excluir o workspace "${target.name}"?` : '';
  }

  confirmDeleteWorkspace(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.saving.set(true);
    this.error.set(null);
    this.closeDeleteWorkspaceModal();

    this.workspaceService.delete(target.id).subscribe({
      next: () => {
        this.saving.set(false);
        const nextWorkspace = this.workspaces()[0];
        if (nextWorkspace) {
          this.selectWorkspace(nextWorkspace.id);
        } else {
          this.history.set([]);
          this.ranking.set([]);
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao excluir workspace'));
      }
    });
  }

  addMember(): void {
    const workspace = this.selectedWorkspace();
    const email = this.memberEmail().trim();
    if (!workspace || !email) {
      this.error.set('Informe o email do membro');
      return;
    }

    const request: AddWorkspaceMemberRequest = {
      userEmail: email,
      role: this.memberRole()
    };

    this.memberSaving.set(true);
    this.error.set(null);

    this.workspaceService.addMember(workspace.id, request).subscribe({
      next: () => {
        this.memberSaving.set(false);
        this.memberEmail.set('');
        this.memberRole.set('MEMBER');
      },
      error: (err) => {
        this.memberSaving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao adicionar membro'));
      }
    });
  }

  removeMember(memberEmail: string): void {
    const workspace = this.selectedWorkspace();
    if (!workspace) return;

    this.memberSaving.set(true);
    this.error.set(null);

    this.workspaceService.removeMember(workspace.id, memberEmail).subscribe({
      next: () => this.memberSaving.set(false),
      error: (err) => {
        this.memberSaving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao remover membro'));
      }
    });
  }

  loadHistory(): void {
    const workspace = this.selectedWorkspace();
    if (!workspace) return;

    this.analyticsLoading.set(true);
    this.analyticsError.set(null);

    this.workspaceService.getChatHistory(workspace.id).subscribe({
      next: (history) => {
        this.history.set(history);
        this.analyticsLoading.set(false);
      },
      error: (err) => {
        this.analyticsLoading.set(false);
        this.handleAnalyticsError(err, 'Erro ao carregar histórico do chat');
      }
    });
  }

  loadRanking(): void {
    const workspace = this.selectedWorkspace();
    if (!workspace) return;

    this.analyticsLoading.set(true);
    this.analyticsError.set(null);

    this.workspaceService
      .getQuestionRanking(workspace.id, this.rankingLimit(), this.similarityThreshold())
      .subscribe({
        next: (ranking) => {
          this.ranking.set(ranking);
          this.analyticsLoading.set(false);
        },
        error: (err) => {
          this.analyticsLoading.set(false);
          this.handleAnalyticsError(err, 'Erro ao carregar ranking de perguntas');
        }
      });
  }

  applyRankingFilters(): void {
    this.loadRanking();
  }

  setActiveTab(tab: 'details' | 'history' | 'ranking'): void {
    this.activeTab.set(tab);

    if (!this.canViewAnalytics()) return;
    if (tab === 'history' && this.history().length === 0) this.loadHistory();
    if (tab === 'ranking' && this.ranking().length === 0) this.loadRanking();
  }

  toggleRank(rank: number): void {
    this.expandedRank.update(current => current === rank ? null : rank);
  }

  roleLabel(role: WorkspaceRole): string {
    const labels: Record<WorkspaceRole, string> = {
      OWNER: 'Dono',
      ADMIN: 'Administrador',
      MEMBER: 'Membro'
    };
    return labels[role];
  }

  typeLabel(type: WorkspaceType): string {
    return type === 'PROFESSIONAL' ? 'Profissional' : 'Acadêmico';
  }

  private handleAnalyticsError(err: any, fallback: string): void {
    if (err.status === 403) {
      this.analyticsError.set('Sem permissão para ver analytics deste workspace');
      return;
    }
    this.analyticsError.set(this.getUserFriendlyError(err, fallback));
  }

  private getUserFriendlyError(err: any, fallback: string): string {
    const msg = err.error?.message;
    if (msg && typeof msg === 'string') return msg;
    if (err.message && typeof err.message === 'string') return err.message;
    return fallback;
  }
}
