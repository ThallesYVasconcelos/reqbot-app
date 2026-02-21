import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { RequirementSet, CreateRequirementSetRequest } from '../models/requirement-set.model';
import { Requirement } from '../models/requirement.model';

@Injectable({
  providedIn: 'root'
})
export class RequirementSetService {
  constructor(private api: ApiService) {}

  getAll(): Observable<RequirementSet[]> {
    return this.api.get<RequirementSet[]>('/api/requirement-sets');
  }

  getById(id: string): Observable<RequirementSet> {
    return this.api.get<RequirementSet>(`/api/requirement-sets/${id}`);
  }

  create(request: CreateRequirementSetRequest): Observable<RequirementSet> {
    return this.api.post<RequirementSet>('/api/requirement-sets', request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/api/requirement-sets/${id}`);
  }

  getRequirements(id: string): Observable<Requirement[]> {
    return this.api.get<Requirement[]>(`/api/requirement-sets/${id}/requirements`);
  }
}
