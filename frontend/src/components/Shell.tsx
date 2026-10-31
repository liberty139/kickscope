import clsx from "clsx";
import { BookOpen, Camera, LineChart, ScanLine, Users } from "lucide-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Logo } from "./Logo";

const NAV = [
  { to: "/analyze", label: "Разбор удара", short: "Удар", icon: ScanLine },
  { to: "/live", label: "Зеркало", short: "Зеркало", icon: Camera },
  { to: "/me", label: "Мой прогресс", short: "Прогресс", icon: LineChart },
  { to: "/team", label: "Тренеру", short: "Тренер", icon: Users },
];

/** App pages: quiet black canvas, a hairline top bar on desktop, a thumb-reachable tab bar on phones. */
export function Shell() {
  const { pathname } = useLocation();
  return (
    <div className="pitch-bg relative min-h-dvh">
      <div className="pitch-lines pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <header className="sticky top-0 z-30 border-b border-white/6 bg-night/70 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Kickscope — на главную">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-0.5 rounded-xl border border-white/6 bg-white/[0.02] p-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
                    isActive ? "bg-white/[0.08] text-chalk shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" : "text-fog hover:text-chalk",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={clsx("h-3.5 w-3.5", isActive && "text-lime")} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <Link to="/method" className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] font-medium text-fog transition hover:text-chalk">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Как это работает</span>
          </Link>
        </div>
      </header>
      <main className="relative mx-auto max-w-6xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-6 md:pb-16 md:pt-10">
        <div key={pathname} className="page-in">
          <Outlet />
        </div>
      </main>
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex gap-1 rounded-2xl border border-white/8 bg-panel/85 p-1 shadow-[0_18px_40px_-14px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl md:hidden">
        {NAV.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx("flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition", isActive ? "bg-white/[0.08] text-chalk" : "text-fog")}
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx("h-5 w-5", isActive && "text-lime")} />
                {short}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
