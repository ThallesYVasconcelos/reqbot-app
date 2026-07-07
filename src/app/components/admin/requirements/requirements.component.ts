import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequirementService } from '../../../services/requirement.service';
import { WorkspaceService } from '../../../services/workspace.service';
import { WorkspaceDTO } from '../../../models/workspace.model';
import { Requirement, RequirementHistory, CreateRequirementRequest, UpdateRequirementRequest, SaveRequirementRequest, RequirementReport } from '../../../models/requirement.model';
import { RequirementSet } from '../../../models/requirement-set.model';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-requirements',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmModalComponent],
  templateUrl: './requirements.component.html',
  styleUrl: './requirements.component.css'
})
export class RequirementsComponent implements OnInit {
  requirements = signal<Requirement[]>([]);
  projects = signal<RequirementSet[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDetailModal = signal(false);
  showHistoryModal = signal(false);
  historyItems = signal<RequirementHistory[]>([]);
  historyLoading = signal(false);
  
  selectedRequirement = signal<Requirement | null>(null);
  selectedProjectId = signal<string>('');
  rawRequirement = signal('');
  error = signal<string | null>(null);

  showDeleteModal = signal(false);
  showReportModal = signal(false);
  actionTarget = signal<Requirement | null>(null);
  report = signal<RequirementReport | null>(null);
  reportLoading = signal(false);

  workspaceList = signal<WorkspaceDTO[]>([]);
  selectedWorkspaceId = signal<string>('');

  constructor(
    private requirementService: RequirementService,
    private workspaceService: WorkspaceService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const projectId = params['projectId'];
    const openCreate = params['create'] === 'true';

    this.workspaceService.loadWorkspaces().subscribe({
      next: (workspaces) => {
        this.workspaceList.set(workspaces);
        if (workspaces.length === 0) {
          this.error.set('Crie um ambiente e projetos para gerir requisitos.');
          return;
        }
        const stored = this.workspaceService.selectedWorkspaceId();
        const wsId =
          stored && workspaces.some(w => w.id === stored) ? stored : workspaces[0].id;
        this.selectedWorkspaceId.set(wsId);
        this.workspaceService.selectWorkspace(wsId);
        this.loadProjectsForWorkspace(wsId, projectId, openCreate);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar ambiente'));
      }
    });
  }

  onWorkspaceChange(workspaceId: string): void {
    this.selectedWorkspaceId.set(workspaceId);
    this.selectedProjectId.set('');
    this.loadProjectsForWorkspace(workspaceId, undefined, false);
  }

  private loadProjectsForWorkspace(
    workspaceId: string,
    preferProjectId: string | undefined,
    openCreate: boolean
  ): void {
    this.workspaceService.listRequirementSets(workspaceId).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        if (projects.length > 0) {
          if (preferProjectId && projects.some(p => p.id === preferProjectId)) {
            this.selectedProjectId.set(preferProjectId);
          } else {
            this.selectedProjectId.set(projects[0].id);
          }
          this.loadRequirements();
          if (openCreate && this.selectedProjectId()) {
            setTimeout(() => this.openCreateModal(), 200);
          }
        } else {
          this.selectedProjectId.set('');
          this.requirements.set([]);
        }
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar projetos do ambiente'));
      }
    });
  }

  loadRequirements(): void {
    // Só carrega se um projeto estiver selecionado
    if (!this.selectedProjectId() || this.selectedProjectId() === 'all') {
      this.requirements.set([]);
      return;
    }

    this.loading.set(true);
    const params: any = {
      requirementSetId: this.selectedProjectId()
    };
    
    this.requirementService.getAll(params).subscribe({
      next: (requirements) => {
        this.requirements.set(requirements);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar requisitos'));
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    if (!this.selectedProjectId() || this.selectedProjectId() === 'all') {
      this.error.set('Selecione um projeto antes de criar um requisito');
      return;
    }
    this.showCreateModal.set(true);
    this.rawRequirement.set('');
    this.error.set(null);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.rawRequirement.set('');
    this.error.set(null);
    this.processingAI.set(false);
    this.savingRequirement.set(false);
    this.aiResponse.set(null);
    this.useRefinedVersion.set(true);
    this.editableRefinedRequirement.set('');
  }

  processingAI = signal(false);
  savingRequirement = signal(false);
  aiResponse = signal<Requirement | null>(null);
  useRefinedVersion = signal(true);

  private buildRefineRequest(): CreateRequirementRequest | null {
    if (!this.selectedProjectId() || this.selectedProjectId() === 'all') {
      this.error.set('Selecione um projeto');
      return null;
    }
    if (!this.rawRequirement().trim()) {
      this.error.set('Digite o requisito');
      return null;
    }
    return {
      requirementSetId: this.selectedProjectId(),
      requirement: this.rawRequirement().trim()
    };
  }

  createRequirement(): void {
    const request = this.buildRefineRequest();
    if (!request) return;

    this.processingAI.set(true);
    this.aiResponse.set(null);
    this.error.set(null);

    this.requirementService.refine(request).subscribe({
      next: (requirement) => {
        this.aiResponse.set(requirement);
        this.editableRefinedRequirement.set(requirement.refinedRequirement);
        this.processingAI.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao processar requisito'));
        this.processingAI.set(false);
      }
    });
  }

  refazerRequirement(): void {
    const request = this.buildRefineRequest();
    if (!request) return;

    this.processingAI.set(true);
    this.error.set(null);

    this.requirementService.refine(request).subscribe({
      next: (requirement) => {
        this.aiResponse.set(requirement);
        this.editableRefinedRequirement.set(requirement.refinedRequirement);
        this.processingAI.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao reprocessar requisito'));
        this.processingAI.set(false);
      }
    });
  }

  saveRequirementWithOriginal(): void {
    const req = this.aiResponse();
    if (!req || !this.selectedProjectId() || this.selectedProjectId() === 'all') return;

    const raw = this.rawRequirement().trim();
    if (!raw) {
      this.error.set('Preencha o requisito em linguagem natural');
      return;
    }

    this.savingRequirement.set(true);
    this.error.set(null);

    const saveRequest: SaveRequirementRequest = {
      requirementSetId: this.selectedProjectId(),
      rawRequirement: raw,
      refinedRequirement: raw,
      useRefinedVersion: false,
      analise: req.analise ?? undefined,
      ambiguityWarnings: req.ambiguityWarnings?.length ? req.ambiguityWarnings : undefined
    };

    this.requirementService.save(saveRequest).subscribe({
      next: () => {
        this.savingRequirement.set(false);
        this.loadRequirements();
        this.closeCreateModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao salvar requisito'));
        this.savingRequirement.set(false);
      }
    });
  }

  saveRequirementWithRefined(): void {
    const req = this.aiResponse();
    if (!req || !this.selectedProjectId() || this.selectedProjectId() === 'all') return;

    const raw = this.rawRequirement().trim();
    const refined = this.getEditableRefinedRequirement();
    if (!raw || !refined) {
      this.error.set('Preencha o requisito em linguagem natural e o refinado');
      return;
    }

    this.savingRequirement.set(true);
    this.error.set(null);

    const saveRequest: SaveRequirementRequest = {
      requirementSetId: this.selectedProjectId(),
      rawRequirement: raw,
      refinedRequirement: refined,
      useRefinedVersion: true,
      analise: req.analise ?? undefined,
      ambiguityWarnings: req.ambiguityWarnings?.length ? req.ambiguityWarnings : undefined
    };

    this.requirementService.save(saveRequest).subscribe({
      next: () => {
        this.savingRequirement.set(false);
        this.loadRequirements();
        this.closeCreateModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao salvar requisito'));
        this.savingRequirement.set(false);
      }
    });
  }

  saveRequirementDirect(): void {
    const text = this.rawRequirement().trim();
    if (!text || !this.selectedProjectId() || this.selectedProjectId() === 'all') return;

    this.savingRequirement.set(true);
    this.error.set(null);

    const saveRequest: SaveRequirementRequest = {
      requirementSetId: this.selectedProjectId(),
      rawRequirement: text,
      refinedRequirement: text,
      useRefinedVersion: true
    };

    this.requirementService.save(saveRequest).subscribe({
      next: () => {
        this.savingRequirement.set(false);
        this.loadRequirements();
        this.closeCreateModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao salvar requisito'));
        this.savingRequirement.set(false);
      }
    });
  }

  editableRefinedRequirement = signal('');

  private getEditableRefinedRequirement(): string {
    return this.editableRefinedRequirement().trim() || this.aiResponse()?.refinedRequirement || '';
  }

  editRequirement = signal('');
  editProcessingAI = signal(false);
  editAiResponse = signal<Requirement | null>(null);
  editEditableRefinedRequirement = signal('');
  editSavingRequirement = signal(false);

  openEditModal(requirement: Requirement): void {
    this.selectedRequirement.set(requirement);
    this.editRequirement.set(requirement.refinedRequirement);
    this.editProcessingAI.set(false);
    this.editAiResponse.set(null);
    this.editEditableRefinedRequirement.set('');
    this.editSavingRequirement.set(false);
    this.showEditModal.set(true);
    this.error.set(null);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedRequirement.set(null);
    this.editRequirement.set('');
    this.editProcessingAI.set(false);
    this.editAiResponse.set(null);
    this.editEditableRefinedRequirement.set('');
    this.editSavingRequirement.set(false);
    this.error.set(null);
  }

  updateRequirementDirect(): void {
    const req = this.selectedRequirement();
    if (!req) return;

    const text = this.editRequirement().trim();
    if (!text) return;

    this.editSavingRequirement.set(true);
    this.error.set(null);

    const request: UpdateRequirementRequest = {
      rawRequirement: text,
      refinedRequirement: text,
      useRefinedVersion: true
    };

    this.requirementService.update(req.uuid, request).subscribe({
      next: () => {
        this.editSavingRequirement.set(false);
        this.loadRequirements();
        this.closeEditModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao atualizar requisito'));
        this.editSavingRequirement.set(false);
      }
    });
  }

  editRefineRequirement(): void {
    const req = this.selectedRequirement();
    if (!req || !req.requirementSetId) return;

    const text = this.editRequirement().trim();
    if (!text) return;

    this.editProcessingAI.set(true);
    this.editAiResponse.set(null);
    this.error.set(null);

    this.requirementService.refine({
      requirementSetId: req.requirementSetId,
      requirement: text
    }).subscribe({
      next: (refined) => {
        this.editAiResponse.set(refined);
        this.editEditableRefinedRequirement.set(refined.refinedRequirement);
        this.editProcessingAI.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao processar requisito'));
        this.editProcessingAI.set(false);
      }
    });
  }

  editRefazerRequirement(): void {
    this.editRefineRequirement();
  }

  updateRequirementWithOriginal(): void {
    const req = this.selectedRequirement();
    if (!req) return;

    const raw = this.editRequirement().trim();
    if (!raw) {
      this.error.set('Preencha o requisito em linguagem natural');
      return;
    }

    this.editSavingRequirement.set(true);
    this.error.set(null);

    const request: UpdateRequirementRequest = {
      rawRequirement: raw,
      refinedRequirement: raw,
      useRefinedVersion: false
    };

    this.requirementService.update(req.uuid, request).subscribe({
      next: () => {
        this.editSavingRequirement.set(false);
        this.loadRequirements();
        this.closeEditModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao atualizar requisito'));
        this.editSavingRequirement.set(false);
      }
    });
  }

  updateRequirementWithRefined(): void {
    const req = this.selectedRequirement();
    const aiReq = this.editAiResponse();
    if (!req || !aiReq) return;

    const raw = this.editRequirement().trim();
    const refined = this.editEditableRefinedRequirement().trim() || aiReq.refinedRequirement;
    if (!raw || !refined) {
      this.error.set('Preencha o requisito refinado');
      return;
    }

    this.editSavingRequirement.set(true);
    this.error.set(null);

    const request: UpdateRequirementRequest = {
      rawRequirement: raw,
      refinedRequirement: refined,
      useRefinedVersion: true
    };

    this.requirementService.update(req.uuid, request).subscribe({
      next: () => {
        this.editSavingRequirement.set(false);
        this.loadRequirements();
        this.closeEditModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao atualizar requisito'));
        this.editSavingRequirement.set(false);
      }
    });
  }

  openDeleteModal(requirement: Requirement): void {
    this.actionTarget.set(requirement);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.actionTarget.set(null);
  }

  confirmDeleteRequirement(): void {
    const req = this.actionTarget();
    if (!req) return;
    this.loading.set(true);
    this.closeDeleteModal();
    this.requirementService.delete(req.uuid).subscribe({
      next: () => this.loadRequirements(),
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao deletar requisito'));
        this.loading.set(false);
      }
    });
  }

  getDeleteConfirmMessage(): string {
    const r = this.actionTarget();
    return r ? `Tem certeza que deseja excluir o requisito "${r.requirementId}"?` : '';
  }

  private getUserFriendlyError(err: any, fallback: string): string {
    const msg = err.error?.message;
    if (msg && typeof msg === 'string') return msg;
    if (err.message && typeof err.message === 'string') return err.message;
    return fallback;
  }

  openDetailModal(requirement: Requirement): void {
    this.selectedRequirement.set(requirement);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedRequirement.set(null);
  }

  openHistoryModal(requirement: Requirement): void {
    this.selectedRequirement.set(requirement);
    this.showHistoryModal.set(true);
    this.historyLoading.set(true);
    this.historyItems.set([]);
    this.requirementService.getHistory(requirement.uuid).subscribe({
      next: (items) => {
        this.historyItems.set(items);
        this.historyLoading.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar histórico'));
        this.historyLoading.set(false);
      }
    });
  }

  closeHistoryModal(): void {
    this.showHistoryModal.set(false);
    this.selectedRequirement.set(null);
    this.historyItems.set([]);
  }

  getHistoryActionLabel(actionType: string): string {
    return actionType === 'CREATED' ? 'Criado' : 'Atualizado';
  }

  onFilterChange(): void {
    this.loadRequirements();
  }

  openReportModal(): void {
    if (!this.selectedProjectId() || this.selectedProjectId() === 'all') {
      this.error.set('Selecione um projeto para ver o relatório');
      return;
    }
    this.showReportModal.set(true);
    this.reportLoading.set(true);
    this.report.set(null);
    this.requirementService.getReport(this.selectedProjectId()).subscribe({
      next: (r) => {
        this.report.set(r);
        this.reportLoading.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar relatório'));
        this.reportLoading.set(false);
      }
    });
  }

  closeReportModal(): void {
    this.showReportModal.set(false);
    this.report.set(null);
  }
}
