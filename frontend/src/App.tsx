import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./components/Shell";
import { Landing } from "./pages/Landing";

const Analyze = lazy(() => import("./pages/Analyze"));
const Result = lazy(() => import("./pages/Result"));
const Live = lazy(() => import("./pages/Live"));
const Me = lazy(() => import("./pages/Me"));
const Team = lazy(() => import("./pages/Team"));
const Method = lazy(() => import("./pages/Method"));
const Demo = lazy(() => import("./pages/Demo"));

const client = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function Loading() {
  return <div className="py-24 text-center text-fog">Загружаю…</div>;
}

export default function App() {
  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<Shell />}>
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/result/:id" element={<Result />} />
              <Route path="/live" element={<Live />} />
              <Route path="/me" element={<Me />} />
              <Route path="/me/:playerId" element={<Me />} />
              <Route path="/team" element={<Team />} />
              <Route path="/team/:code" element={<Team />} />
              <Route path="/join/:code" element={<Team />} />
              <Route path="/method" element={<Method />} />
              <Route path="/demo" element={<Demo />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
