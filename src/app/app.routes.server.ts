import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'app/projects/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'app/spaces/:workspaceId/projects',
    renderMode: RenderMode.Server
  },
  {
    path: 'app/spaces/:workspaceId/team',
    renderMode: RenderMode.Server
  },
  {
    path: 'app/spaces/:workspaceId/ranking',
    renderMode: RenderMode.Server
  },
  {
    path: 'chatbots/:chatbotId',
    renderMode: RenderMode.Server
  },
  {
    path: 'admin/:path',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
