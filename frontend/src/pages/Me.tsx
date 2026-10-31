import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Target, Users } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LineChart, ScoreRing } from "../components/Charts";
import { Button, Card, Chip, Empty, Eyebrow, LinkButton, PageTitle, STATUS } from "../components/ui";
import { api } from "../lib/api";
import { metricText, perWeek, when } from "../lib/format";
import { local, useLocal } from "../lib/me";

export default function Me() {
  const { playerId } = useParams();
  const { me } = useLocal();
  const id = playerId ?? me?.id;
  if (!id) return <CreateProfile />;
  return <Progress id={id} own={!playerId || playerId === me?.id} />;
}

function CreateProfile() {
  const [nick, setNick] = useState("");
  const navigate = useNavigate();
  const create = useMutation({
    mutationFn: () => api.createPlayer(nick.trim()),
    onSuccess: (p) => local.setMe({ id: p.id, nickname: p.nickname, team_code: p.team_code }),
  });
  return (
    <div>
      <PageTitle eyebrow="Мой прогресс" title="Как тебя зовут?" lead="Достаточно ника. Все разборы будут собираться в график: видно, приближаешься ли ты к эталону неделя за неделей." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (nick.trim()) create.mutate();
            }}
          >
            <input value={nick} onChange={(e) => setNick(e.target.value)} placeholder="Ник, например Арсен" maxLength={40} className="h-14 w-full rounded-2xl border border-line bg-night/60 px-5 text-lg outline-none focus:border-lime" />
            <Button className="mt-4 w-full" size="lg" arrow busy={create.isPending} disabled={!nick.trim()}>
              Создать профиль
            </Button>
          </form>
          {create.isError && <p className="mt-3 text-sm text-coral">{(create.error as Error).message}</p>}
        </Card>
        <Card className="flex flex-col justify-between p-6">
          <div>
            <Eyebrow>Пример</Eyebrow>
            <p className="mt-2 text-fog">Посмотри, как выглядит прогресс: демо-команда из шести игроков, у каждого своя ошибка, которую он исправлял пять недель.</p>
          </div>
          <Button variant="glass" className="mt-5 self-start" onClick={() => navigate("/team/DEMO1")}>
            <Users className="h-4 w-4" /> Открыть демо-команду
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Progress({ id, own }: { id: string; own: boolean }) {
  const q = useQuery({ queryKey: ["progress", id], queryFn: () => api.progress(id) });
  if (q.isLoading) return <div className="py-24 text-center text-fog">Загружаю прогресс…</div>;
  if (q.isError || !q.data)
    return (
      <Empty title="Профиль не найден" text="Сервер мог перезапуститься и потерять данные. Создай профиль заново.">
        <Button onClick={() => local.setMe(null)}>Создать заново</Button>
      </Empty>
    );
  const { player, attempts, scores, score_per_week, metrics } = q.data;
  const isDemo = !!player.is_demo;
  const last = attempts[attempts.length - 1];
  return (
    <div>
      <PageTitle eyebrow={own ? "Мой прогресс" : "Прогресс игрока"} title={player.nickname} lead={attempts.length ? `${attempts.length} разборов · последний ${when(last.created)}` : "Разборов пока нет"}>
        <div className="flex flex-wrap gap-2">
          {isDemo && <Chip tone="amber">демо-данные</Chip>}
          {player.team_code && (
            <Link to={`/team/${player.team_code}`}>
              <Chip tone="lime">
                <Users className="h-3.5 w-3.5" /> команда {player.team_code}
              </Chip>
            </Link>
          )}
        </div>
      </PageTitle>

      {!attempts.length ? (
        <Empty title="Здесь появится твой прогресс" text="Разбери первый удар — и он станет отправной точкой.">
          <LinkButton to="/analyze" arrow>
            Разобрать удар
          </LinkButton>
          <LinkButton to="/live" variant="glass">
            Зеркало
          </LinkButton>
        </Empty>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.6fr]">
            <Card className="flex items-center gap-6 p-6">
              <ScoreRing score={last.score} />
              <div>
                <Eyebrow>Последняя оценка</Eyebrow>
                {scores.length > 1 && (
                  <p className={clsx("mt-2 flex items-center gap-1 font-display text-2xl font-semibold", scores[scores.length - 1] >= scores[0] ? "text-mint" : "text-coral")}>
                    {scores[scores.length - 1] >= scores[0] ? <ArrowUpRight className="h-6 w-6" /> : <ArrowDownRight className="h-6 w-6" />}
                    {Math.abs(Math.round(scores[scores.length - 1] - scores[0]))}
                  </p>
                )}
                <p className="mt-1 text-sm text-fog">{scores.length > 1 ? `с первого разбора${score_per_week ? ` · ${perWeek(score_per_week, "балла")}` : ""}` : "это твоя отправная точка"}</p>
                {last.focus && (
                  <p className="mt-3 flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-coral" /> Работаем над: <b>{metrics.find((m) => m.key === last.focus)?.label}</b>
                  </p>
                )}
              </div>
            </Card>
            <Card className="p-6">
              <Eyebrow>Оценка по разборам</Eyebrow>
              <LineChart className="mt-4" values={scores} height={130} labels={attempts.length > 1 ? [shortDate(attempts[0].created), shortDate(last.created)] : undefined} />
            </Card>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {metrics.map((m) => {
              const v = m.values[m.values.length - 1];
              const trend = perWeek(m.per_week, m.unit);
              const st = STATUS[m.status];
              return (
                <Card key={m.key} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{m.label}</p>
                      <p className="text-xs text-fog">эталон {metricText(m.key, m.ref).value}</p>
                    </div>
                    <p className={clsx("hud text-xl font-bold", st.text)}>{metricText(m.key, v).value}</p>
                  </div>
                  <LineChart className="mt-3" values={m.values} band={[m.ref - m.ref_sd, m.ref + m.ref_sd]} height={80} color={m.status === "good" ? "#2BD67B" : m.status === "warn" ? "#FFC145" : "#FF5A4F"} />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-fog">{trend ?? "без заметного тренда"}</span>
                    {m.closer !== null && <span className={m.closer ? "font-bold text-mint" : "font-bold text-amber"}>{m.closer ? "ближе к эталону" : "пока дальше"}</span>}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="mt-5 p-2">
            {[...attempts].reverse().map((a) => (
              <Link key={a.id} to={`/result/${a.id}`} className="flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-white/5">
                <span className={clsx("hud flex h-11 w-11 items-center justify-center rounded-xl font-bold", a.score >= 85 ? "bg-mint/15 text-mint" : a.score >= 65 ? "bg-lime/15 text-lime" : "bg-amber/15 text-amber")}>{Math.round(a.score)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{when(a.created)}</p>
                  <p className="truncate text-xs text-fog">{a.focus ? `главное: ${metrics.find((m) => m.key === a.focus)?.label}` : "все показатели в норме"}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-fog" />
              </Link>
            ))}
          </Card>

          {own && !isDemo && (
            <div className="mt-6 flex flex-wrap gap-3">
              <LinkButton to="/analyze" arrow>
                Новый разбор
              </LinkButton>
              <button onClick={() => local.setMe(null)} className="text-sm font-bold text-fog hover:text-chalk">
                Выйти из профиля на этом устройстве
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const shortDate = (ts: number) => new Date(ts * 1000).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
