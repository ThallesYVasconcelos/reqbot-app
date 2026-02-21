import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RequirementSetService } from '../../../services/requirement-set.service';
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
  projects = signal<RequirementSet[]>([]);
  recentRequirements = signal<Requirement[]>([]);
  loading = signal(true);

  constructor(
    private projectService: RequirementSetService,
    private requirementService: RequirementService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.projectService.getAll().subscribe({
      next: (projects) => {
        this.projects.set(projects.slice(0, 5));
        this.loadRequirements();
      },
      error: (err) => {
        this.loading.set(false);
      }
    });
  }

  loadRequirements(): void {
    this.requirementService.getAll().subscribe({
      next: (requirements) => {
        this.recentRequirements.set(requirements.slice(0, 5));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
      }
    });
  }

  getRequirementCount(): number {
    return this.recentRequirements().length;
  }
}
