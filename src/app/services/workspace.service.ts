import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import {
  AcceptAdminInvitationRequest,
  AddWorkspaceMemberRequest,
  AdminInvitationResponse,
  ChatMessageDTO,
  ChatQuestionClusterDTO,
  CreateAdminInvitationRequest,
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceDTO
} from '../models/workspace.model';
import { CreateRequirementSetRequest, RequirementSet } from '../models/requirement-set.model';

const SELECTED_WORKSPACE_KEY = 'selectedWorkspaceId';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private platformId = inject(PLATFORM_ID);
  private workspacesState = signal<WorkspaceDTO[]>([]);
  private selectedWorkspaceIdState = signal<string | null>(this.getStoredSelectedWorkspaceId());

  readonly workspaces = this.workspacesState.asReadonly();
  readonly selectedWorkspaceId = this.selectedWorkspaceIdState.asReadonly();
  readonly selectedWorkspace = computed(() => {
    const selectedId = this.selectedWorkspaceIdState();
    return this.workspacesState().find(workspace => workspace.id === selectedId) ?? null;
  });

  constructor(private api: ApiService) {}

  loadWorkspaces(): Observable<WorkspaceDTO[]> {
    return this.api.get<WorkspaceDTO[]>('/api/workspaces').pipe(
      tap(workspaces => {
        this.workspacesState.set(workspaces);
        this.ensureSelectedWorkspace(workspaces);
      })
    );
  }

  getById(id: string): Observable<WorkspaceDTO> {
    return this.api.get<WorkspaceDTO>(`/api/workspaces/${id}`);
  }

  create(request: CreateWorkspaceRequest): Observable<WorkspaceDTO> {
    return this.api.post<WorkspaceDTO>('/api/workspaces', request).pipe(
      tap(workspace => {
        this.workspacesState.update(workspaces => [workspace, ...workspaces]);
        this.selectWorkspace(workspace.id);
      })
    );
  }

  update(id: string, request: UpdateWorkspaceRequest): Observable<WorkspaceDTO> {
    return this.api.put<WorkspaceDTO>(`/api/workspaces/${id}`, request).pipe(
      tap(updated => {
        this.workspacesState.update(workspaces =>
          workspaces.map(workspace => workspace.id === updated.id ? updated : workspace)
        );
      })
    );
  }

  delete(id: string): Observable<void> {
    return this.api.delete<void>(`/api/workspaces/${id}`).pipe(
      tap(() => {
        const remaining = this.workspacesState().filter(workspace => workspace.id !== id);
        this.workspacesState.set(remaining);
        if (this.selectedWorkspaceIdState() === id) {
          this.selectWorkspace(remaining[0]?.id ?? null);
        }
      })
    );
  }

  addMember(id: string, request: AddWorkspaceMemberRequest): Observable<WorkspaceDTO> {
    return this.inviteAdmin(id, { email: request.userEmail }) as unknown as Observable<WorkspaceDTO>;
  }

  inviteAdmin(id: string, request: CreateAdminInvitationRequest): Observable<AdminInvitationResponse> {
    return this.api.post<AdminInvitationResponse>(`/api/workspaces/${id}/admin-invitations`, request);
  }

  acceptAdminInvitation(request: AcceptAdminInvitationRequest): Observable<WorkspaceDTO> {
    return this.api.post<WorkspaceDTO>('/api/workspace-admin-invitations/accept', request).pipe(
      tap(workspace => {
        this.workspacesState.update(workspaces => {
          const exists = workspaces.some(item => item.id === workspace.id);
          return exists
            ? workspaces.map(item => item.id === workspace.id ? workspace : item)
            : [workspace, ...workspaces];
        });
        this.selectWorkspace(workspace.id);
      })
    );
  }

  removeMember(id: string, memberEmail: string): Observable<WorkspaceDTO> {
    return of(this.selectedWorkspace() as WorkspaceDTO);
  }

  /** Aluno entra no workspace com código de convite */
  joinByInviteCode(code: string): Observable<WorkspaceDTO> {
    return this.acceptAdminInvitation({ token: code.trim() });
  }

  listRequirementSets(workspaceId: string): Observable<RequirementSet[]> {
    return this.api.get<RequirementSet[]>(`/api/workspaces/${workspaceId}/requirement-sets`);
  }

  createRequirementSet(workspaceId: string, body: CreateRequirementSetRequest): Observable<RequirementSet> {
    return this.api.post<RequirementSet>(`/api/workspaces/${workspaceId}/requirement-sets`, body);
  }

  /** Histórico completo (Owner/Admin) */
  getChatHistory(id: string): Observable<ChatMessageDTO[]> {
    return of([]);
  }

  getQuestionRanking(
    id: string,
    limit: number,
    similarityThreshold: number
  ): Observable<ChatQuestionClusterDTO[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('similarityThreshold', similarityThreshold);

    return this.api.get<ChatQuestionClusterDTO[]>(
      `/api/workspaces/${id}/chat-question-ranking`,
      params
    );
  }

  selectWorkspace(id: string | null): void {
    this.selectedWorkspaceIdState.set(id);
    if (!isPlatformBrowser(this.platformId)) return;

    if (id) {
      localStorage.setItem(SELECTED_WORKSPACE_KEY, id);
    } else {
      localStorage.removeItem(SELECTED_WORKSPACE_KEY);
    }
  }

  clearSelection(): void {
    this.selectWorkspace(null);
    this.workspacesState.set([]);
  }

  private replaceWorkspace(updated: WorkspaceDTO): void {
    this.workspacesState.update(workspaces =>
      workspaces.map(workspace => workspace.id === updated.id ? updated : workspace)
    );
  }

  private ensureSelectedWorkspace(workspaces: WorkspaceDTO[]): void {
    if (workspaces.length === 0) {
      this.selectWorkspace(null);
      return;
    }

    const currentId = this.selectedWorkspaceIdState();
    if (!currentId || !workspaces.some(workspace => workspace.id === currentId)) {
      this.selectWorkspace(workspaces[0].id);
    }
  }

  private getStoredSelectedWorkspaceId(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    return localStorage.getItem(SELECTED_WORKSPACE_KEY);
  }
}
