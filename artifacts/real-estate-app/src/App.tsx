import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Home from "@/pages/home";
import Tasks from "@/pages/tasks";
import Position from "@/pages/position";
import Earnings from "@/pages/earnings";
import Profile from "@/pages/profile";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Admin from "@/pages/admin";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    } else if (!isLoading && user && adminOnly && user.role !== "admin") {
      setLocation("/");
    } else if (!isLoading && user && !adminOnly && user.role === "admin") {
      setLocation("/admin");
    }
  }, [user, isLoading, setLocation, adminOnly]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return null;
  if (adminOnly && user.role !== "admin") return null;
  if (!adminOnly && user.role === "admin") return null;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} adminOnly={true} />}
      </Route>
      <Route path="/">
        <Layout>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute component={Home} />} />
            <Route path="/tasks" component={() => <ProtectedRoute component={Tasks} />} />
            <Route path="/position" component={() => <ProtectedRoute component={Position} />} />
            <Route path="/earnings" component={() => <ProtectedRoute component={Earnings} />} />
            <Route path="/my" component={() => <ProtectedRoute component={Profile} />} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;