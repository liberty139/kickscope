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

/** App pages: the void with a violet glow above, a frosted top bar on desktop, a thumb-reachable tab bar on phones. */
export function Shell() {
  const { pathname } = useLocation();
  return (
    <div className="pitch-bg relative min-h-dvh">
      <div className="pitch-lines pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <header className="sticky top-0 z-30 border-b border-[#6b6b6b]/70 bg-[rgb(51_50_72/0.7)] pt-[env(safe-area-inset-top)] backdrop-blur-[10px]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Kickscope — на главную">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    "label flex items-center gap-2 rounded-lg px-3 py-2 transition",
                    isActive ? "bg-chalk/[0.1] text-chalk" : "text-chalk/70 hover:text-chalk",
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
          <Link to="/method" className="btn-outline label flex items-center gap-2 px-3 py-2 text-chalk">
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
      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 flex gap-1 rounded-2xl border border-chalk/12 bg-[rgb(31_30_44/0.85)] p-1 backdrop-blur-[10px] md:hidden">
        {NAV.map(({ to, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => clsx("flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-medium transition", isActive ? "bg-chalk/[0.1] text-chalk" : "text-chalk/60")}
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
