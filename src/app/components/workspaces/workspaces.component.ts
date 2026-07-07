import { Component, OnInit, computed, inject, PLATFORM_ID, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { WorkspaceService } from '../../services/workspace.service';
import { ChatbotService } from '../../services/chatbot.service';
import { ConfirmModalComponent } from '../shared/confirm-modal/confirm-modal.component';
import { Router } from '@angular/router';
import {
  AddWorkspaceMemberRequest,
  ChatQuestionClusterDTO,
  CreateWorkspaceRequest,
  ProjectUserDTO,
  UpdateWorkspaceRequest,
  WorkspaceDTO,
  WorkspaceRole,
  WorkspaceType
} from '../../models/workspace.model';
import { RequirementSet, CreateRequirementSetRequest } from '../../models/requirement-set.model';
import { ChatbotConfig } from '../../models/chatbot.model';

type WorkspaceForm = {
  name: string;
  description: string;
  type: WorkspaceType;
};

type ProjectUsersResult = {
  projectId: string;
  users: ProjectUserDTO[];
};

type ChatbotRankingResult = {
  chatbotId: string;
  ranking: ChatQuestionClusterDTO[];
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
  private chatbotService = inject(ChatbotService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  readonly authService = inject(AuthService);

  workspaces = this.workspaceService.workspaces;
  selectedWorkspaceId = this.workspaceService.selectedWorkspaceId;
  selectedWorkspace = this.workspaceService.selectedWorkspace;

  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  analyticsError = signal<string | null>(null);
  activeTab = signal<'details' | 'projects' | 'ranking'>('details');

  joinCodeInput = signal('');
  joinLoading = signal(false);
  copyFeedback = signal<string | null>(null);

  /** Projetos (atividades) do workspace selecionado */
  projects = signal<RequirementSet[]>([]);
  projectsLoading = signal(false);
  showProjectModal = signal(false);
  newProjectName = signal('');
  newProjectDescription = signal('');

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

  chatbots = signal<ChatbotConfig[]>([]);
  projectUsers = signal<Record<string, ProjectUserDTO[]>>({});
  chatbotRankings = signal<Record<string, ChatQuestionClusterDTO[]>>({});
  analyticsLoading = signal(false);
  rankingLimit = signal(10);
  similarityThreshold = signal(0.82);
  expandedRank = signal<number | null>(null);

  questionsByProject = computed(() =>
    this.projects().map(project => ({
      project,
      users: this.projectUsers()[project.id] ?? [],
      chatbots: this.chatbots()
        .filter(chatbot => chatbot.requirementSetId === project.id)
        .map(chatbot => ({
          chatbot,
          ranking: this.chatbotRankings()[chatbot.id] ?? []
        }))
    }))
  );

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
    return role === 'OWNER';
  });
  canViewAnalytics = computed(() => this.canManageMembers());
  canCreateWorkspace = computed(() => this.authService.isAuthenticated() && this.workspaces().length === 0);
  canManageProjects = computed(() => {
    const role = this.userWorkspaceRole();
    return role === 'OWNER' || role === 'ADMIN';
  });
  /** Membros comuns não veem gestão do workspace (convite, abas, analytics). */
  isMemberOnly = computed(() => this.userWorkspaceRole() === 'MEMBER');

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
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar ambiente'));
      }
    });
  }

  selectWorkspace(id: string): void {
    this.workspaceService.selectWorkspace(id);
    this.analyticsError.set(null);
    this.chatbots.set([]);
    this.projectUsers.set({});
    this.chatbotRankings.set({});
    this.loadWorkspaceProjects();

    if (this.canViewAnalytics()) {
      this.loadQuestions();
    }
  }

  loadWorkspaceProjects(): void {
    const w = this.selectedWorkspace();
    if (!w) {
      this.projects.set([]);
      return;
    }
    if (this.userWorkspaceRole() === 'MEMBER') {
      this.projects.set([]);
      this.projectsLoading.set(false);
      return;
    }
    this.projectsLoading.set(true);
    this.workspaceService.listRequirementSets(w.id).subscribe({
      next: (list) => {
        this.projects.set(list);
        this.projectsLoading.set(false);
      },
      error: () => {
        this.projects.set([]);
        this.projectsLoading.set(false);
      }
    });
  }

  openCreateProjectModal(): void {
    this.newProjectName.set('');
    this.newProjectDescription.set('');
    this.error.set(null);
    this.showProjectModal.set(true);
  }

  closeProjectModal(): void {
    this.showProjectModal.set(false);
  }

  createProjectInWorkspace(): void {
    const w = this.selectedWorkspace();
    if (!w || !this.newProjectName().trim()) {
      this.error.set('Nome do projeto é obrigatório');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body: CreateRequirementSetRequest = {
      name: this.newProjectName().trim(),
      description: this.newProjectDescription().trim()
    };
    this.workspaceService.createRequirementSet(w.id, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.closeProjectModal();
        this.loadWorkspaceProjects();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao criar projeto'));
      }
    });
  }

  goToProject(project: RequirementSet): void {
    this.router.navigate(['/app/projects', project.id]);
  }

  joinByCode(): void {
    const token = this.joinCodeInput().trim();
    if (!token) {
      this.error.set('Digite o token do convite de admin');
      return;
    }
    this.joinLoading.set(true);
    this.error.set(null);
    this.workspaceService.acceptAdminInvitation({ token }).subscribe({
      next: () => {
        this.joinLoading.set(false);
        this.joinCodeInput.set('');
        this.loadWorkspaces();
      },
      error: (err) => {
        this.joinLoading.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Token invalido ou convite de admin indisponivel'));
      }
    });
  }

  copyInviteCode(code: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    navigator.clipboard.writeText(code).then(
      () => {
        this.copyFeedback.set('Copiado!');
        setTimeout(() => this.copyFeedback.set(null), 2000);
      },
      () => this.copyFeedback.set('Não foi possível copiar')
    );
  }

  openCreateWorkspaceModal(): void {
    if (!this.canCreateWorkspace()) {
      this.error.set('Esta conta ja possui um ambiente.');
      return;
    }
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
    if (!this.editingWorkspace() && !this.canCreateWorkspace()) {
      this.error.set('Esta conta ja possui um ambiente.');
      return;
    }
    if (!form.name.trim()) {
      this.error.set('Nome do ambiente e obrigatorio');
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
        this.error.set(this.getUserFriendlyError(err, 'Erro ao salvar ambiente'));
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
    return target ? `Tem certeza que deseja excluir o ambiente "${target.name}"?` : '';
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
          this.chatbots.set([]);
          this.projectUsers.set({});
          this.chatbotRankings.set({});
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao excluir ambiente'));
      }
    });
  }

  addMember(): void {
    const workspace = this.selectedWorkspace();
    const email = this.memberEmail().trim();
    if (!workspace || !email) {
      this.error.set('Informe o email do administrador');
      return;
    }

    this.memberSaving.set(true);
    this.error.set(null);

    this.workspaceService.inviteAdmin(workspace.id, { email }).subscribe({
      next: (invite) => {
        this.memberSaving.set(false);
        this.memberEmail.set('');
        this.memberRole.set('ADMIN');
        this.copyFeedback.set(`Token de convite: ${invite.token}`);
      },
      error: (err) => {
        this.memberSaving.set(false);
        this.error.set(this.getUserFriendlyError(err, 'Erro ao criar convite de administrador'));
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

  loadQuestions(): void {
    const workspace = this.selectedWorkspace();
    if (!workspace) return;

    this.analyticsLoading.set(true);
    this.analyticsError.set(null);

    forkJoin({
      projects: this.workspaceService.listRequirementSets(workspace.id),
      chatbots: this.chatbotService.getWorkspaceChatbots(workspace.id)
    }).subscribe({
      next: ({ projects, chatbots }) => {
        this.projects.set(projects);
        this.chatbots.set(chatbots);

        const userRequests = projects.map(project =>
          this.workspaceService.getRequirementSetUsers(workspace.id, project.id).pipe(
            map(users => ({ projectId: project.id, users }) as ProjectUsersResult),
            catchError(() => of({ projectId: project.id, users: [] } as ProjectUsersResult))
          )
        );

        const rankingRequests = chatbots.map(chatbot =>
          this.chatbotService
            .getWorkspaceChatbotQuestionRanking(
              workspace.id,
              chatbot.id,
              this.rankingLimit(),
              this.similarityThreshold()
            )
            .pipe(
              map(ranking => ({ chatbotId: chatbot.id, ranking }) as ChatbotRankingResult),
              catchError(() => of({ chatbotId: chatbot.id, ranking: [] } as ChatbotRankingResult))
            )
        );

        const users$ = userRequests.length ? forkJoin(userRequests) : of([] as ProjectUsersResult[]);
        const rankings$ = rankingRequests.length ? forkJoin(rankingRequests) : of([] as ChatbotRankingResult[]);

        forkJoin({ users: users$, rankings: rankings$ }).subscribe({
          next: ({ users, rankings }) => {
            this.projectUsers.set(
              users.reduce<Record<string, ProjectUserDTO[]>>((acc, item) => {
                acc[item.projectId] = item.users;
                return acc;
              }, {})
            );
            this.chatbotRankings.set(
              rankings.reduce<Record<string, ChatQuestionClusterDTO[]>>((acc, item) => {
                acc[item.chatbotId] = item.ranking;
                return acc;
              }, {})
            );
          },
          error: (err) => this.handleAnalyticsError(err, 'Erro ao carregar perguntas dos chatbots'),
          complete: () => this.analyticsLoading.set(false)
        });
      },
      error: (err) => {
        this.projects.set([]);
        this.chatbots.set([]);
        this.projectUsers.set({});
        this.chatbotRankings.set({});
        this.analyticsLoading.set(false);
        this.handleAnalyticsError(err, 'Erro ao carregar perguntas dos projetos');
      }
    });
  }

  loadRanking(): void {
    this.loadQuestions();
  }

  applyRankingFilters(): void {
    this.loadQuestions();
  }

  setActiveTab(tab: 'details' | 'projects' | 'ranking'): void {
    this.activeTab.set(tab);

    if (tab === 'projects') {
      this.loadWorkspaceProjects();
    }
    if (!this.canViewAnalytics()) return;
    if (tab === 'ranking') this.loadQuestions();
  }

  toggleRank(rank: number): void {
    this.expandedRank.update(current => current === rank ? null : rank);
  }

  isChatbotActive(chatbot: ChatbotConfig): boolean {
    return chatbot.isActive === true || chatbot.active === true;
  }

  formatJoinedAt(joinedAt: string): string {
    return joinedAt || '';
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
      this.analyticsError.set('Sem permissao para ver metricas deste ambiente');
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
