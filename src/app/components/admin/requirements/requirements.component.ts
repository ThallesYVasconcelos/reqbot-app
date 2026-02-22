import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequirementService } from '../../../services/requirement.service';
import { RequirementSetService } from '../../../services/requirement-set.service';
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

  constructor(
    private requirementService: RequirementService,
    private projectService: RequirementSetService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParams;
    const projectId = params['projectId'];
    const openCreate = params['create'] === 'true';

    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        if (projects.length > 0) {
          if (projectId && projects.some(p => p.id === projectId)) {
            this.selectedProjectId.set(projectId);
          } else if (!this.selectedProjectId()) {
            this.selectedProjectId.set(projects[0].id);
          }
          this.loadRequirements();
          if (openCreate && this.selectedProjectId()) {
            setTimeout(() => this.openCreateModal(), 200);
          }
        }
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar projetos'));
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

  saveRequirement(): void {
    const req = this.aiResponse();
    if (!req || !this.selectedProjectId() || this.selectedProjectId() === 'all') return;

    const raw = this.rawRequirement().trim();
    const refined = this.getEditableRefinedRequirement();
    if (!raw || !refined) {
      this.error.set('Preencha o prompt e o requisito refinado');
      return;
    }

    this.savingRequirement.set(true);
    this.error.set(null);

    const saveRequest: SaveRequirementRequest = {
      requirementSetId: this.selectedProjectId(),
      rawRequirement: raw,
      refinedRequirement: refined,
      useRefinedVersion: this.useRefinedVersion(),
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

  editableRefinedRequirement = signal('');

  private getEditableRefinedRequirement(): string {
    return this.editableRefinedRequirement().trim() || this.aiResponse()?.refinedRequirement || '';
  }

  editRawRequirement = signal('');
  editRefinedRequirement = signal('');
  editUseRefinedVersion = signal(true);

  openEditModal(requirement: Requirement): void {
    this.selectedRequirement.set(requirement);
    this.editRawRequirement.set(requirement.rawRequirement ?? requirement.refinedRequirement);
    this.editRefinedRequirement.set(requirement.refinedRequirement);
    this.editUseRefinedVersion.set(true);
    this.showEditModal.set(true);
    this.error.set(null);
  }

  closeEditModal(): void {
    this.showEditModal.set(false);
    this.selectedRequirement.set(null);
    this.editRawRequirement.set('');
    this.editRefinedRequirement.set('');
    this.error.set(null);
  }

  updateRequirement(): void {
    const req = this.selectedRequirement();
    if (!req) return;

    const raw = this.editRawRequirement().trim();
    const refined = this.editRefinedRequirement().trim();
    if (!raw || !refined) {
      this.error.set('Preencha o prompt e o requisito refinado');
      return;
    }

    this.loading.set(true);
    const request: UpdateRequirementRequest = {
      rawRequirement: raw,
      refinedRequirement: refined,
      useRefinedVersion: this.editUseRefinedVersion()
    };

    this.requirementService.update(req.uuid, request).subscribe({
      next: () => {
        this.loadRequirements();
        this.closeEditModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao atualizar requisito'));
        this.loading.set(false);
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
