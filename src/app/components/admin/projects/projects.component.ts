import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../../services/workspace.service';
import { RequirementSetService } from '../../../services/requirement-set.service';
import { RequirementSet, CreateRequirementSetRequest } from '../../../models/requirement-set.model';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';
import { WorkspaceDTO } from '../../../models/workspace.model';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmModalComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private projectService = inject(RequirementSetService);

  workspaces = signal<WorkspaceDTO[]>([]);
  selectedWorkspaceId = signal<string>('');
  projects = signal<RequirementSet[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  newProjectName = signal('');
  newProjectDescription = signal('');
  error = signal<string | null>(null);
  showDeleteModal = signal(false);
  deleteTarget = signal<{ id: string; name: string } | null>(null);

  ngOnInit(): void {
    this.loadWorkspaces();
  }

  loadWorkspaces(): void {
    this.loading.set(true);
    this.error.set(null);
    this.workspaceService.loadWorkspaces().subscribe({
      next: (list) => {
        this.workspaces.set(list);
        if (list.length > 0) {
          const sel =
            this.selectedWorkspaceId() && list.some(w => w.id === this.selectedWorkspaceId())
              ? this.selectedWorkspaceId()
              : list[0].id;
          this.selectedWorkspaceId.set(sel);
          this.loadProjectsForWorkspace(sel);
        } else {
          this.projects.set([]);
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar workspaces'));
        this.loading.set(false);
      }
    });
  }

  onWorkspaceChange(id: string): void {
    this.selectedWorkspaceId.set(id);
    this.workspaceService.selectWorkspace(id);
    this.loadProjectsForWorkspace(id);
  }

  loadProjectsForWorkspace(workspaceId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.workspaceService.listRequirementSets(workspaceId).subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao carregar projetos'));
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
    if (!this.selectedWorkspaceId()) {
      this.error.set('Selecione um workspace');
      return;
    }
    this.showCreateModal.set(true);
    this.newProjectName.set('');
    this.newProjectDescription.set('');
    this.error.set(null);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.newProjectName.set('');
    this.newProjectDescription.set('');
    this.error.set(null);
  }

  createProject(): void {
    if (!this.newProjectName().trim()) {
      this.error.set('Nome do projeto é obrigatório');
      return;
    }
    const ws = this.selectedWorkspaceId();
    if (!ws) return;

    this.loading.set(true);
    this.error.set(null);
    const request: CreateRequirementSetRequest = {
      name: this.newProjectName().trim(),
      description: this.newProjectDescription().trim()
    };

    this.workspaceService.createRequirementSet(ws, request).subscribe({
      next: () => {
        this.loadProjectsForWorkspace(ws);
        this.closeCreateModal();
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao criar projeto'));
        this.loading.set(false);
      }
    });
  }

  openDeleteModal(id: string, name: string): void {
    this.deleteTarget.set({ id, name });
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.deleteTarget.set(null);
  }

  getDeleteConfirmMessage(): string {
    const t = this.deleteTarget();
    return t ? `Tem certeza que deseja excluir o projeto "${t.name}"?` : '';
  }

  confirmDeleteProject(): void {
    const target = this.deleteTarget();
    if (!target) return;

    this.loading.set(true);
    this.error.set(null);
    this.closeDeleteModal();
    const ws = this.selectedWorkspaceId();

    this.projectService.delete(target.id).subscribe({
      next: () => {
        if (ws) this.loadProjectsForWorkspace(ws);
        else this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.getUserFriendlyError(err, 'Erro ao deletar projeto'));
        this.loading.set(false);
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
