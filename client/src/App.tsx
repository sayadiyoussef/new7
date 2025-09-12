import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./hooks/useAuth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Market from "@/pages/market";
import Chat from "@/pages/chat";
import Analytics from "@/pages/analytics";
import Fixings from "@/pages/fixings";
import Navires from "@/pages/navires";
import Knowledge from "@/pages/knowledge";
import Grades from "@/pages/grades";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path="/" component={isAuthenticated ? Dashboard : Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/market" component={Market} />
      <Route path="/chat" component={Chat} />
      <Route path="/grades" component={Grades} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/fixings" component={Fixings} />
      <Route path="/navires" component={Navires} />
      <Route path="/knowledge" component={Knowledge} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
