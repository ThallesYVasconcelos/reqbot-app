import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { ApiService } from './api.service';
import { RequirementSet } from '../models/requirement-set.model';
import { Requirement } from '../models/requirement.model';

@Injectable({
  providedIn: 'root'
})
export class RequirementSetService {
  constructor(private api: ApiService) {}

  getById(id: string): Observable<RequirementSet> {
    return of({
      id,
      name: 'Projeto',
      description: '',
      createdAt: '',
      updatedAt: ''
    });
  }

  delete(id: string): Observable<void> {
    return of(void 0);
  }

  getRequirements(id: string): Observable<Requirement[]> {
    const params = new HttpParams().set('requirementSetId', id);
    return this.api.get<Requirement[]>('/api/requirements', params);
  }
}
