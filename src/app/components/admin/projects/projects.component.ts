import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RequirementSetService } from '../../../services/requirement-set.service';
import { RequirementSet, CreateRequirementSetRequest } from '../../../models/requirement-set.model';
import { ConfirmModalComponent } from '../../shared/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ConfirmModalComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  projects = signal<RequirementSet[]>([]);
  loading = signal(false);
  showCreateModal = signal(false);
  newProjectName = signal('');
  newProjectDescription = signal('');
  error = signal<string | null>(null);
  showDeleteModal = signal(false);
  deleteTarget = signal<{ id: string; name: string } | null>(null);

  constructor(private projectService: RequirementSetService) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);
    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (err) => {
        const errorMsg = this.getUserFriendlyError(err, 'Erro ao carregar projetos');
        this.error.set(errorMsg);
        this.loading.set(false);
      }
    });
  }

  openCreateModal(): void {
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

    this.loading.set(true);
    this.error.set(null);
    const request: CreateRequirementSetRequest = {
      name: this.newProjectName().trim(),
      description: this.newProjectDescription().trim()
    };

    this.projectService.create(request).subscribe({
      next: () => {
        setTimeout(() => {
          this.loadProjects();
        }, 300);
        this.closeCreateModal();
      },
      error: (err) => {
        const errorMsg = this.getUserFriendlyError(err, 'Erro ao criar projeto');
        this.error.set(errorMsg);
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

    this.projectService.delete(target.id).subscribe({
      next: () => {
        this.loadProjects();
      },
      error: (err) => {
        const errorMsg = this.getUserFriendlyError(err, 'Erro ao deletar projeto');
        this.error.set(errorMsg);
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
