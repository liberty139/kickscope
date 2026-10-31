import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { AlertTriangle, ArrowLeft, Bot, Check, Copy, ListChecks, ScanLine, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LineChart, ScoreRing } from "../components/Charts";
import { Stage } from "../components/Stage";
import { Card, Chip, Empty, Eyebrow, LinkButton, STATUS } from "../components/ui";
import { api, type Attempt, type MetricRow } from "../lib/api";
import { metricText, when } from "../lib/format";
import { session } from "../lib/session";

export default function Result() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const attempt = useQuery({ queryKey: ["attempt", id], queryFn: () => api.attempt(id) });
  const refId = attempt.data?.comparison.ref_id;
  const reference = useQuery({ queryKey: ["ref", refId], queryFn: () => api.ref(refId!), enabled: !!refId, staleTime: Infinity });
  const recompute = useMutation({
    mutationFn: (contact: number) => api.recompute(id, { contact }),
    onSuccess: (a) => {
      qc.setQueryData(["attempt", id], a);
      qc.invalidateQueries({ queryKey: ["advice", id] });
    },
  });

  if (attempt.isLoading) return <div className="py-24 text-center text-fog">Загружаю разбор…</div>;
  if (attempt.isError || !attempt.data)
    return (
      <Empty title="Разбор не найден" text="Возможно, ссылка устарела или сервер перезапускался.">
        <LinkButton to="/analyze" arrow>
          Разобрать удар
        </LinkButton>
      </Empty>
    );

  const a = attempt.data;
  const an = a.analysis;
  const cmp = a.comparison;
  const clip = session.get(a.id);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/analyze" className="inline-flex items-center gap-1.5 text-sm font-bold text-fog hover:text-chalk">
            <ArrowLeft className="h-4 w-4" /> Новый разбор
          </Link>
          <h1 className="mt-2 font-display text-2xl font-semibold md:text-3xl">Разбор удара</h1>
          <p className="mt-1 text-sm text-fog">{when(a.created)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {a.is_demo && <Chip tone="amber">демо-данные</Chip>}
          <Chip>{an.kick_foot === "left" ? "левая нога" : "правая нога"}</Chip>
          <Chip>{Math.round(an.fps)} к/с</Chip>
          {a.source === "live" && <Chip tone="lime">зеркало</Chip>}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <Card className="p-3 sm:p-4">
          <Stage
            analysis={an}
            landmarks={a.landmarks}
            reference={reference.data}
            ghostFrames={cmp.ghost_frames}
            ghostSwap={cmp.ghost_swap}
            clip={clip}
            onSetContact={a.is_demo ? undefined : (f) => recompute.mutate(f)}
            busy={recompute.isPending}
          />
          <Notes attempt={a} />
        </Card>

        <div className="space-y-5">
          <Card className="p-6">
            <div className="flex items-center gap-5">
              <ScoreRing score={cmp.score} />
              <div>
                <Eyebrow>Оценка удара</Eyebrow>
                <p className="mt-2 text-sm text-fog">
                  Похожесть на «{cmp.ref_name}» и отклонения по шести показателям. Это не оценка таланта, а точка отсчёта.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {cmp.phase_scores.map((p) => (
                <div key={p.key}>
                  <div className="flex justify-between text-sm">
                    <span className="text-chalk/80">{p.label}</span>
                    <span className="hud font-bold">{Math.round(p.score)}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/8">
                    <div
                      className={clsx("h-full rounded-full transition-all duration-700", p.score >= 80 ? "bg-mint" : p.score >= 55 ? "bg-lime" : p.score >= 35 ? "bg-amber" : "bg-coral")}
                      style={{ width: `${Math.max(3, p.score)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Advice attempt={a} />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.55fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>Показатели</Eyebrow>
            <span className="text-xs text-fog">эталон: среднее ± разброс</span>
          </div>
          <div className="mt-4 divide-y divide-white/5">
            {cmp.metrics.map((m) => (
              <MetricLine key={m.key} m={m} focus={m.key === cmp.focus} />
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Chain attempt={a} />
          <Card className="p-5">
            <Eyebrow>Угол колена по времени</Eyebrow>
            <LineChart className="mt-4" values={an.series.knee} marker={an.phases.contact} color="#3DF2FF" height={110} />
            <p className="mt-2 text-xs text-fog">Пунктир — момент удара. Хорошо видно замах (провал) и разгибание к мячу.</p>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton to="/analyze" arrow>
          Разобрать ещё удар
        </LinkButton>
        <LinkButton to={a.player_id ? `/me/${a.player_id}` : "/me"} variant="glass">
          <ListChecks className="h-4 w-4" /> Прогресс
        </LinkButton>
        <CopyLink />
      </div>
    </div>
  );
}

function Notes({ attempt }: { attempt: Attempt }) {
  const an = attempt.analysis;
  const notes: string[] = [];
  if (!an.phases.confident) notes.push("Момент удара найден неуверенно. Поставь ползунок на кадр касания мяча и нажми «Удар здесь».");
  if (an.scale.source === "assumed") notes.push("Мяч не отмечен, поэтому сантиметры и скорость стопы — оценка по росту 170 см.");
  if (an.missing_share > 0.15) notes.push(`Часть точек скелета (${Math.round(an.missing_share * 100)}%) была плохо видна и восстановлена.`);
  if (!notes.length) return null;
  return (
    <div className="mt-4 space-y-2">
      {notes.map((t) => (
        <p key={t} className="flex gap-2 rounded-xl bg-amber/10 px-3 py-2 text-sm text-amber">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t}
        </p>
      ))}
    </div>
  );
}

function MetricLine({ m, focus }: { m: MetricRow; focus: boolean }) {
  const t = metricText(m.key, m.value);
  const st = STATUS[m.status];
  const z = m.z ?? 0;
  const pos = 50 + Math.max(-3, Math.min(3, z)) * (50 / 3);
  return (
    <div className={clsx("grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3.5 sm:grid-cols-[1.3fr_1fr_auto]", focus && "-mx-3 rounded-2xl bg-coral/8 px-3")}>
      <div>
        <p className="font-semibold">
          {m.label}
          {focus && <span className="ml-2 rounded-full bg-coral/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-coral">главное</span>}
        </p>
        {t.hint && <p className="text-xs text-fog">{t.hint}</p>}
      </div>
      <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
        {m.z !== null ? (
          <div className="relative h-2 rounded-full bg-white/6">
            <div className="absolute inset-y-0 left-1/3 right-1/3 rounded-full bg-mint/20" />
            <div className={clsx("absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-night", st.bg)} style={{ left: `${pos}%` }} />
          </div>
        ) : (
          <p className="text-xs text-fog">для информации</p>
        )}
        {m.z !== null && <p className="mt-1.5 text-[11px] text-fog">эталон {metricText(m.key, m.ref).value}</p>}
      </div>
      <p className={clsx("hud text-right text-lg font-bold", st.text)}>{t.value}</p>
    </div>
  );
}

function Chain({ attempt }: { attempt: Attempt }) {
  const ch = attempt.analysis.chain;
  const pts = [
    { label: "Бедро", ms: ch.thigh_ms, color: "bg-cyan" },
    { label: "Голень", ms: ch.shank_ms, color: "bg-lime" },
    { label: "Стопа", ms: ch.foot_ms, color: "bg-chalk" },
  ];
  const lo = Math.min(-120, ...pts.map((p) => p.ms)) - 10;
  const hi = Math.max(30, ...pts.map((p) => p.ms)) + 10;
  const x = (ms: number) => ((ms - lo) / (hi - lo)) * 100;
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Eyebrow>Кинетическая цепочка</Eyebrow>
        <Chip tone={ch.order_ok ? "mint" : "coral"}>{ch.order_ok ? "по порядку" : "сбой порядка"}</Chip>
      </div>
      <p className="mt-2 text-sm text-fog">Пик скорости бедра должен прийти раньше пика голени: так энергия доходит до мяча.</p>
      <div className="relative mt-5">
        <div className="absolute inset-y-0 w-px bg-lime/70" style={{ left: `calc(4.5rem + (100% - 4.5rem) * ${x(0) / 100})` }} />
        {pts.map((p) => (
          <div key={p.label} className="flex h-8 items-center">
            <span className="w-[4.5rem] shrink-0 text-xs font-bold text-chalk/80">{p.label}</span>
            <div className="relative h-px flex-1 bg-white/12">
              <span className={clsx("absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-deep", p.color)} style={{ left: `${x(p.ms)}%` }} />
            </div>
          </div>
        ))}
        <div className="mt-1 flex text-[10px] font-bold text-fog">
          <span className="w-[4.5rem]" />
          <span className="relative flex-1">
            <span className="absolute -translate-x-1/2 text-lime" style={{ left: `${x(0)}%` }}>
              удар
            </span>
            <span className="absolute left-0">{Math.round(lo)} мс</span>
          </span>
        </div>
      </div>
    </Card>
  );
}

function Advice({ attempt }: { attempt: Attempt }) {
  const q = useQuery({ queryKey: ["advice", attempt.id], queryFn: () => api.advice(attempt.id), staleTime: Infinity });
  const text = q.data?.text ?? "";
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!text) return;
    setShown(0);
    const t = setInterval(() => setShown((n) => (n >= text.length ? (clearInterval(t), n) : n + 2)), 14);
    return () => clearInterval(t);
  }, [text]);
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-lime/10 blur-2xl" />
      <div className="flex items-center justify-between">
        <Eyebrow>Совет тренера</Eyebrow>
        {q.data && (
          <Chip tone={q.data.source === "llm" ? "lime" : "glass"}>
            {q.data.source === "llm" ? <Bot className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {q.data.source === "llm" ? "ИИ по цифрам" : "по правилам"}
          </Chip>
        )}
      </div>
      {q.isLoading ? (
        <div className="mt-4 space-y-2">
          <div className="h-4 w-11/12 animate-pulse rounded bg-white/8" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/8" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-white/8" />
        </div>
      ) : (
        <p className="relative mt-4 text-[17px] leading-relaxed">
          {text.slice(0, shown)}
          {shown < text.length && <span className="ml-0.5 inline-block h-5 w-0.5 translate-y-1 animate-pulse bg-lime" />}
        </p>
      )}
      {q.data?.source === "llm" && <p className="mt-3 text-xs text-fog">ИИ видел только цифры, не видео. Все числа в тексте проверены по измерениям.</p>}
      <LinkButton to="/analyze" variant="glass" size="sm" className="mt-5">
        <ScanLine className="h-4 w-4" /> Сделать упражнение и снять снова
      </LinkButton>
    </Card>
  );
}

function CopyLink() {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(location.href).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1600);
        });
      }}
      className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-sm font-bold text-chalk/80 hover:bg-white/5"
    >
      {ok ? <Check className="h-4 w-4 text-mint" /> : <Copy className="h-4 w-4" />} {ok ? "Ссылка скопирована" : "Поделиться"}
    </button>
  );
}
