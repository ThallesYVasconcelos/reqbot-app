import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    children: [
      { path: '', redirectTo: 'user', pathMatch: 'full' },
      { path: 'admin', loadComponent: () => import('./components/login/login-user/login-user.component').then(m => m.LoginUserComponent) },
      { path: 'user', loadComponent: () => import('./components/login/login-user/login-user.component').then(m => m.LoginUserComponent) }
    ]
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./components/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: 'spaces', loadComponent: () => import('./components/workspaces/workspaces.component').then(m => m.WorkspacesComponent) },
      { path: 'spaces/:workspaceId/projects', loadComponent: () => import('./components/admin/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'spaces/:workspaceId/team', loadComponent: () => import('./components/workspaces/workspaces.component').then(m => m.WorkspacesComponent) },
      { path: 'spaces/:workspaceId/ranking', loadComponent: () => import('./components/workspaces/workspaces.component').then(m => m.WorkspacesComponent) },
      { path: 'projects', loadComponent: () => import('./components/admin/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'projects/:id', loadComponent: () => import('./components/admin/project-detail/project-detail.component').then(m => m.ProjectDetailComponent) },
      { path: 'requirements', loadComponent: () => import('./components/admin/requirements/requirements.component').then(m => m.RequirementsComponent) },
      { path: 'chatbots', loadComponent: () => import('./components/admin/chatbot-config/chatbot-config.component').then(m => m.ChatbotConfigComponent) },
      { path: 'team', loadComponent: () => import('./components/workspaces/workspaces.component').then(m => m.WorkspacesComponent) },
      { path: 'metrics', loadComponent: () => import('./components/workspaces/workspaces.component').then(m => m.WorkspacesComponent) },
      { path: '', redirectTo: 'spaces', pathMatch: 'full' }
    ]
  },
  {
    path: 'chatbots/join',
    canActivate: [authGuard],
    loadComponent: () => import('./components/chatbot/chatbot.component').then(m => m.ChatbotComponent)
  },
  {
    path: 'chatbots/:chatbotId',
    canActivate: [authGuard],
    loadComponent: () => import('./components/chatbot/chatbot.component').then(m => m.ChatbotComponent)
  },
  {
    path: 'admin',
    redirectTo: '/app/spaces',
    pathMatch: 'full'
  },
  {
    path: 'admin/:path',
    redirectTo: '/app/spaces'
  },
  {
    path: 'chatbot',
    redirectTo: '/chatbots/join',
    pathMatch: 'full'
  },
  {
    path: 'workspaces',
    redirectTo: '/app/spaces',
    pathMatch: 'full'
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
