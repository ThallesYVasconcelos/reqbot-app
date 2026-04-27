import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
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

  projects = signal<RequirementSet[]>([]);
  recentRequirements = signal<Requirement[]>([]);
  loading = signal(true);
  workspaceCount = signal(0);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.workspaceService.loadWorkspaces().subscribe({
      next: (workspaces) => {
        this.workspaceCount.set(workspaces.length);
        if (workspaces.length === 0) {
          this.projects.set([]);
          this.recentRequirements.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(
          workspaces.map(w =>
            this.workspaceService.listRequirementSets(w.id)
          )
        ).subscribe({
          next: (arrays) => {
            const flat = (arrays as RequirementSet[][]).flat();
            this.projects.set(flat.slice(0, 5));
            this.loadRequirements();
          },
          error: () => {
            this.loading.set(false);
          }
        });
      },
      error: () => this.loading.set(false)
    });
  }

  loadRequirements(): void {
    this.requirementService.getAll().subscribe({
      next: (requirements) => {
        this.recentRequirements.set(requirements.slice(0, 5));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  getRequirementCount(): number {
    return this.recentRequirements().length;
  }
}
