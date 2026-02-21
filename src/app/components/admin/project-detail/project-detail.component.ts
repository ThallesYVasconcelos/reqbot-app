import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { RequirementSetService } from '../../../services/requirement-set.service';
import { RequirementSet } from '../../../models/requirement-set.model';
import { Requirement } from '../../../models/requirement.model';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css'
})
export class ProjectDetailComponent implements OnInit {
  project = signal<RequirementSet | null>(null);
  requirements = signal<Requirement[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private projectService: RequirementSetService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProject(id);
      this.loadRequirements(id);
    }
  }

  loadProject(id: string): void {
    this.loading.set(true);
    this.projectService.getById(id).subscribe({
      next: (project) => {
        this.project.set(project);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Erro ao carregar projeto');
        this.loading.set(false);
      }
    });
  }

  loadRequirements(id: string): void {
    this.projectService.getRequirements(id).subscribe({
      next: (requirements) => {
        this.requirements.set(requirements);
      },
      error: (err) => {
      }
    });
  }

}
