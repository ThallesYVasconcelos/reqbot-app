import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    children: [
      { path: '', redirectTo: 'admin', pathMatch: 'full' },
      { path: 'admin', loadComponent: () => import('./components/login/login-admin/login-admin.component').then(m => m.LoginAdminComponent) },
      { path: 'user', loadComponent: () => import('./components/login/login-user/login-user.component').then(m => m.LoginUserComponent) }
    ]
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./components/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./components/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'projects',
        loadComponent: () => import('./components/admin/projects/projects.component').then(m => m.ProjectsComponent)
      },
      {
        path: 'projects/:id',
        loadComponent: () => import('./components/admin/project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
      },
      {
        path: 'requirements',
        loadComponent: () => import('./components/admin/requirements/requirements.component').then(m => m.RequirementsComponent)
      },
      {
        path: 'chatbot',
        loadComponent: () => import('./components/admin/chatbot-config/chatbot-config.component').then(m => m.ChatbotConfigComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./components/admin/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'chatbot',
    canActivate: [authGuard],
    loadComponent: () => import('./components/chatbot/chatbot.component').then(m => m.ChatbotComponent)
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
