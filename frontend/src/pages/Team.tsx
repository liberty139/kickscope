import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ChevronRight, Copy, Plus, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Card, Chip, Empty, Eyebrow, LinkButton, PageTitle, STATUS } from "../components/ui";
import { api } from "../lib/api";
import { local, useLocal } from "../lib/me";

export default function Team() {
  const { code } = useParams();
  const { pathname } = useLocation();
  if (code && pathname.startsWith("/join")) return <Join code={code.toUpperCase()} />;
  if (code) return <Dashboard code={code.toUpperCase()} />;
  return <Teams />;
}

function Teams() {
  const { teams } = useLocal();
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: () => api.createTeam(name.trim()),
    onSuccess: (t) => {
      local.addTeam({ code: t.code, name: t.name });
      navigate(`/team/${t.code}`);
    },
  });
  return (
    <div>
      <PageTitle eyebrow="Тренеру" title="Кабинет тренера" lead="Создай команду, покажи игрокам QR — каждый их разбор появится здесь. Сразу видно, какие ошибки повторяются у группы." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <Eyebrow>Новая команда</Eyebrow>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например, U14 · ДЮСШ №2" maxLength={60} className="h-12 min-w-0 flex-1 rounded-2xl border border-line bg-night/60 px-4 text-base outline-none focus:border-lime" />
            <Button busy={create.isPending} disabled={!name.trim()}>
              <Plus className="h-4 w-4" /> Создать
            </Button>
          </form>
          {teams.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-fog">Мои команды</p>
              {teams.map((t) => (
                <Link key={t.code} to={`/team/${t.code}`} className="flex items-center justify-between rounded-2xl bg-night/50 px-4 py-3 hover:bg-white/5">
                  <span className="font-semibold">{t.name}</span>
                  <span className="hud text-sm text-lime">{t.code}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
        <Card className="flex flex-col justify-between p-6">
          <div>
            <Eyebrow>Демо</Eyebrow>
            <p className="mt-2 font-display text-xl font-semibold">Демо · U15</p>
            <p className="mt-2 text-fog">Шесть игроков, пять недель, у каждого своя типичная ошибка. Синтетические данные — чтобы показать, как выглядит кабинет.</p>
          </div>
          <LinkButton to="/team/DEMO1" variant="glass" className="mt-5 self-start" arrow>
            Открыть демо-команду
          </LinkButton>
        </Card>
      </div>
    </div>
  );
}

function Dashboard({ code }: { code: string }) {
  const q = useQuery({ queryKey: ["team", code], queryFn: () => api.team(code) });
  const [copied, setCopied] = useState(false);
  if (q.isLoading) return <div className="py-24 text-center text-fog">Загружаю команду…</div>;
  if (q.isError || !q.data)
    return (
      <Empty title={`Команда ${code} не найдена`} text="Проверь код или создай новую команду.">
        <LinkButton to="/team">К командам</LinkButton>
      </Empty>
    );
  const { team, players, issues, total } = q.data;
  const joinUrl = `${location.origin}/join/${team.code}`;
  const withScores = players.filter((p) => p.score !== undefined);
  const avg = withScores.length ? Math.round(withScores.reduce((s, p) => s + (p.score ?? 0), 0) / withScores.length) : null;
  const improved = withScores.filter((p) => (p.score ?? 0) > (p.first_score ?? 0) + 2).length;
  return (
    <div>
      <PageTitle eyebrow="Кабинет тренера" title={team.name} lead={`${total} игроков · код ${team.code}`}>
        {team.is_demo ? <Chip tone="amber">демо-данные</Chip> : null}
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Игроков", String(total)],
              ["Средняя оценка", avg === null ? "—" : String(avg)],
              ["Растут", `${improved} из ${withScores.length}`],
            ].map(([l, v]) => (
              <Card key={l} className="p-4">
                <p className="text-[10px] font-bold uppercase leading-tight tracking-wider text-fog sm:text-[11px]">{l}</p>
                <p className="hud mt-2 whitespace-nowrap text-lg font-bold sm:text-3xl">{v}</p>
              </Card>
            ))}
          </div>
          <Card className="p-5 sm:p-6">
            <Eyebrow>Частые ошибки группы</Eyebrow>
            {issues.length === 0 ? (
              <p className="mt-3 text-fog">Пока нет повторяющихся ошибок.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {issues.map((i) => (
                  <div key={i.key + i.text} className="rounded-2xl bg-night/50 p-4">
                    <p className="font-semibold">
                      <span className="hud text-coral">
                        {i.count} из {total}
                      </span>{" "}
                      {i.text}
                    </p>
                    <p className="mt-1 text-sm text-fog">{i.players.join(", ")}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-coral" style={{ width: `${(i.count / Math.max(1, total)) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-2">
            {players.length === 0 ? (
              <p className="p-5 text-fog">В команде пока никого. Покажи игрокам QR справа.</p>
            ) : (
              players.map((p) => (
                <Link key={p.id} to={`/me/${p.id}`} className="flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-white/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 font-display font-semibold">{p.nickname[0]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{p.nickname}</p>
                    <p className="truncate text-xs text-fog">{p.attempts ? `${p.attempts} разборов${p.focus ? ` · ${p.focus}` : " · всё в норме"}` : "ещё не разбирал удары"}</p>
                  </div>
                  <div className="hidden gap-1 sm:flex">
                    {p.statuses &&
                      Object.entries(p.statuses).map(([k, s]) => <span key={k} className={clsx("h-2.5 w-2.5 rounded-full", STATUS[s].bg)} title={k} />)}
                  </div>
                  {p.score !== undefined && (
                    <span className="hud w-16 text-right font-bold">
                      {Math.round(p.score)}
                      {p.first_score !== undefined && p.score !== p.first_score && (
                        <span className={clsx("ml-1 text-xs", p.score > p.first_score ? "text-mint" : "text-coral")}>
                          {p.score > p.first_score ? "+" : "−"}
                          {Math.abs(Math.round(p.score - p.first_score))}
                        </span>
                      )}
                    </span>
                  )}
                  <ChevronRight className="h-5 w-5 text-fog" />
                </Link>
              ))
            )}
          </Card>
        </div>

        <Card className="h-fit p-6 text-center">
          <Eyebrow>Вход для игроков</Eyebrow>
          <div className="mx-auto mt-4 w-fit rounded-3xl bg-chalk p-4">
            <QRCodeSVG value={joinUrl} size={180} fgColor="#0A0F1C" bgColor="#F4F7F2" />
          </div>
          <p className="hud mt-4 text-3xl font-bold tracking-[0.2em] text-lime">{team.code}</p>
          <button
            onClick={() => navigator.clipboard?.writeText(joinUrl).then(() => (setCopied(true), setTimeout(() => setCopied(false), 1500)))}
            className="mx-auto mt-3 flex items-center gap-2 text-sm font-bold text-fog hover:text-chalk"
          >
            <Copy className="h-4 w-4" /> {copied ? "Скопировано" : "Скопировать ссылку"}
          </button>
          <p className="mt-4 text-xs text-fog">Игрок сканирует QR, вводит ник — и его разборы попадают в команду. Никаких аккаунтов и фамилий.</p>
        </Card>
      </div>
    </div>
  );
}

function Join({ code }: { code: string }) {
  const { me } = useLocal();
  const navigate = useNavigate();
  const [nick, setNick] = useState(me?.nickname ?? "");
  const team = useQuery({ queryKey: ["team", code], queryFn: () => api.team(code) });
  const join = useMutation({
    mutationFn: async () => {
      if (me) {
        await api.joinTeam(code, me.id);
        local.setMe({ ...me, team_code: code });
      } else {
        const p = await api.createPlayer(nick.trim(), code);
        local.setMe({ id: p.id, nickname: p.nickname, team_code: p.team_code });
      }
    },
    onSuccess: () => navigate("/analyze"),
  });
  if (team.isError) return <Empty title={`Команда ${code} не найдена`} text="Попроси тренера показать QR ещё раз." />;
  return (
    <div className="mx-auto max-w-md">
      <Card className="p-7 text-center">
        <Users className="mx-auto h-10 w-10 text-lime" />
        <p className="mt-4 text-sm font-bold text-fog">Приглашение в команду</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">{team.data?.team.name ?? code}</h1>
        {me ? (
          <p className="mt-4 text-fog">
            Ты вступишь как <b className="text-chalk">{me.nickname}</b>.
          </p>
        ) : (
          <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Твой ник" maxLength={40} className="mt-5 h-14 w-full rounded-2xl border border-line bg-night/60 px-5 text-center text-lg outline-none focus:border-lime" />
        )}
        <Button className="mt-5 w-full" size="lg" arrow busy={join.isPending} disabled={!me && !nick.trim()} onClick={() => join.mutate()}>
          Вступить и разобрать удар
        </Button>
        {join.isError && <p className="mt-3 text-sm text-coral">{(join.error as Error).message}</p>}
      </Card>
    </div>
  );
}
