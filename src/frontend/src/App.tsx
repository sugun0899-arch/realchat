import { Layout } from "@/components/Layout";
import { CallPage } from "@/pages/CallPage";
import { ChatPage } from "@/pages/ChatPage";
import { ConversationsPage } from "@/pages/ConversationsPage";
import { DirectoryPage } from "@/pages/DirectoryPage";
import { ProfilePage } from "@/pages/ProfilePage";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/conversations" });
  },
});

const conversationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conversations",
  component: ConversationsPage,
});

const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/conversations/$conversationId",
  component: ChatPage,
});

const directoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/directory",
  component: DirectoryPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const callRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/call/$conversationId",
  component: CallPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  conversationsRoute,
  chatRoute,
  directoryRoute,
  profileRoute,
  callRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
