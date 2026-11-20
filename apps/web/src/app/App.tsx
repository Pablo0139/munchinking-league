import {
  Link,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useRouter,
} from '@tanstack/react-router';
import { Login } from '../features/auth/Login';
import { Admin } from '../features/admin/Admin';
import { History } from '../features/history/History';
import { Library } from '../features/library/Library';
import { Notifications } from '../features/notifications/Notifications';
import { Profile } from '../features/profile/Profile';
import { Home, LeagueLayout } from '../features/table/LeagueTable';
import { queryClient, sessionQuery } from '../lib/session';

function ConnectionError() {
  const router = useRouter();
  return (
    <main className="ml-state">
      <p className="ml-kicker">Munchinking League</p>
      <h1>No se pudo abrir la mesa</h1>
      <p>Comprueba la conexión e inténtalo de nuevo.</p>
      <button className="ml-primary" onClick={() => void router.invalidate()}>
        Reintentar
      </button>
    </main>
  );
}

const root = createRootRoute({
  component: Outlet,
  notFoundComponent: () => (
    <main className="ml-state">
      <h1>Página no encontrada</h1>
      <Link to="/home">Volver al inicio</Link>
    </main>
  ),
});

const index = createRoute({
  getParentRoute: () => root,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/home', replace: true });
  },
});

const login = createRoute({
  getParentRoute: () => root,
  path: 'login',
  beforeLoad: async () => {
    if (await queryClient.fetchQuery(sessionQuery)) {
      throw redirect({ to: '/home', replace: true });
    }
  },
  component: Login,
});

const member = createRoute({
  getParentRoute: () => root,
  id: 'member',
  beforeLoad: async () => {
    const session = await queryClient.fetchQuery(sessionQuery);
    if (!session) {
      queryClient.clear();
      throw redirect({ to: '/login', replace: true });
    }
    return { session };
  },
  component: () => {
    const { session } = member.useRouteContext();
    return (
      <LeagueLayout key={session.user.id} session={session}>
        <Outlet />
      </LeagueLayout>
    );
  },
});

const home = createRoute({
  getParentRoute: () => member,
  path: 'home',
  component: () => <Home session={member.useRouteContext().session} />,
});

const history = createRoute({
  getParentRoute: () => member,
  path: 'history',
  component: () => <History managerId={member.useRouteContext().session.manager.id} />,
});

const library = createRoute({
  getParentRoute: () => member,
  path: 'library',
  component: () => <Library managerId={member.useRouteContext().session.manager.id} />,
});

const profile = createRoute({
  getParentRoute: () => member,
  path: 'profile',
  component: () => <Profile session={member.useRouteContext().session} />,
});

const notices = createRoute({
  getParentRoute: () => member,
  path: 'notifications',
  component: () => <Notifications managerId={member.useRouteContext().session.manager.id} />,
});

const admin = createRoute({
  getParentRoute: () => member,
  path: 'admin',
  beforeLoad: ({ context }) => {
    if (context.session.user.role !== 'ADMIN') throw redirect({ to: '/home', replace: true });
  },
  component: () => <Admin managerId={member.useRouteContext().session.manager.id} />,
});

const router = createRouter({
  routeTree: root.addChildren([
    index,
    login,
    member.addChildren([home, history, library, profile, notices, admin]),
  ]),
  defaultErrorComponent: ConnectionError,
  defaultPendingComponent: () => (
    <main className="ml-state" role="status">
      Abriendo la mesa…
    </main>
  ),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export const App = () => <RouterProvider router={router} />;