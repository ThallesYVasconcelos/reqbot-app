import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkspaceService } from '../../../services/workspace.service';
import { RequirementService } from '../../../services/requirement.service';
import { RequirementSet } from '../../../models/requirement-set.model';
import { Requirement } from '../../../models/requirement.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private workspaceService = inject(WorkspaceService);
  private requirementService = inject(RequirementService);

  /** Apenas o workspace selecionado (visão do admin “da turma”). */
  workspaceName = signal<string | null>(null);
  /** Total de projetos (requirement sets) no workspace selecionado. */
  projectTotalCount = signal(0);
  /** Até 5 projetos para a lista “recentes”. */
  projects = signal<RequirementSet[]>([]);
  /** Total de requisitos em todos os projetos do workspace. */
  requirementTotalCount = signal(0);
  recentRequirements = signal<Requirement[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.workspaceService.loadWorkspaces().subscribe({
      next: (workspaces) => {
        if (workspaces.length === 0) {
          this.workspaceName.set(null);
          this.projectTotalCount.set(0);
          this.projects.set([]);
          this.requirementTotalCount.set(0);
          this.recentRequirements.set([]);
          this.loading.set(false);
          return;
        }
        const wsId =
          this.workspaceService.selectedWorkspaceId() && workspaces.some(w => w.id === this.workspaceService.selectedWorkspaceId())
            ? this.workspaceService.selectedWorkspaceId()!
            : workspaces[0].id;
        this.workspaceService.selectWorkspace(wsId);
        const ws = workspaces.find(w => w.id === wsId) ?? workspaces[0];
        this.workspaceName.set(ws.name);

        this.workspaceService.listRequirementSets(wsId).subscribe({
          next: (sets) => {
            this.projectTotalCount.set(sets.length);
            this.projects.set(sets.slice(0, 5));
            this.loadRequirementsForSets(sets);
          },
          error: () => this.loading.set(false)
        });
      },
      error: () => this.loading.set(false)
    });
  }

  private loadRequirementsForSets(sets: RequirementSet[]): void {
    if (sets.length === 0) {
      this.requirementTotalCount.set(0);
      this.recentRequirements.set([]);
      this.loading.set(false);
      return;
    }

    forkJoin(
      sets.map(s => this.requirementService.getBySetId(s.id).pipe(
        map(reqs => reqs ?? [])
      ))
    )
      .pipe(
        map(arrays => (arrays as Requirement[][]).flat()),
        map(all => {
          this.requirementTotalCount.set(all.length);
          return [...all].sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          ).slice(0, 5);
        })
      )
      .subscribe({
        next: (recent) => {
          this.recentRequirements.set(recent);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }
}
