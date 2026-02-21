import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  Requirement,
  CreateRequirementRequest,
  UpdateRequirementRequest,
  SaveRequirementRequest,
  RequirementHistory,
  RequirementReport
} from '../models/requirement.model';

@Injectable({
  providedIn: 'root'
})
export class RequirementService {
  constructor(private api: ApiService) {}

  getAll(params?: { requirementSetId?: string }): Observable<Requirement[]> {
    let httpParams = new HttpParams();
    if (params?.requirementSetId) {
      httpParams = httpParams.set('requirementSetId', params.requirementSetId);
    }
    return this.api.get<Requirement[]>('/api/requirements', httpParams);
  }

  getById(id: string): Observable<Requirement> {
    return this.api.get<Requirement>(`/api/requirements/${id}`);
  }

  getBySetId(requirementSetId: string): Observable<Requirement[]> {
    return this.api.get<Requirement[]>(`/api/requirements/set/${requirementSetId}`);
  }

  refine(request: CreateRequirementRequest): Observable<Requirement> {
    return this.api.post<Requirement>('/api/requirements/refine', request);
  }

  save(request: SaveRequirementRequest): Observable<Requirement> {
    return this.api.post<Requirement>('/api/requirements/save', request);
  }

  update(id: string, request: UpdateRequirementRequest): Observable<Requirement> {
    return this.api.put<Requirement>(`/api/requirements/${id}`, request);
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/api/requirements/${id}`);
  }

  getHistory(id: string): Observable<RequirementHistory[]> {
    return this.api.get<RequirementHistory[]>(`/api/requirements/${id}/history`);
  }

  getReport(requirementSetId: string): Observable<RequirementReport> {
    const params = new HttpParams().set('requirementSetId', requirementSetId);
    return this.api.get<RequirementReport>('/api/requirements/report', params);
  }
}
