import { Brain, Calculator, Eye, Ghost, MessageSquareText, ShieldCheck } from "lucide-react";
import { Card, Eyebrow, LinkButton, PageTitle } from "../components/ui";

const STEPS = [
  { icon: Eye, title: "ИИ видит позу", text: "Модель MediaPipe Pose прямо в браузере находит 33 точки тела на каждом кадре. Видео не покидает телефон." },
  { icon: Calculator, title: "Математика меряет", text: "Сервер сглаживает траектории, находит фазы удара и считает углы и скорости по геометрии точек. Ни одно число не придумывает нейросеть." },
  { icon: Ghost, title: "Эталон сравнивает", text: "Алгоритм DTW выравнивает твой удар по времени с эталонным, даже если ты бьёшь медленнее. Так появляется «призрак» и оценки по фазам." },
  { icon: MessageSquareText, title: "Текст объясняет", text: "Языковая модель получает только цифры и пишет два предложения. Если в тексте появится число, которого не было в измерениях, его заменяет совет по правилам." },
];

const METRICS = [
  ["Колено в момент удара", "Угол бедро–колено–голеностоп бьющей ноги в кадре касания мяча."],
  ["Наклон корпуса", "Угол линии «таз → плечи» к вертикали в момент удара. Плюс — над мячом, минус — назад."],
  ["Опорная нога у мяча", "Где стоит опорный голеностоп относительно точки удара вдоль линии удара, в сантиметрах."],
  ["Скорость голени", "Максимальная угловая скорость голени во время маха, в градусах в секунду."],
  ["Сгибание в замахе", "Наименьший угол колена перед ударом: насколько глубоко «взведена» нога."],
  ["Бедро → голень", "Через сколько миллисекунд после пика бедра наступает пик голени. Так энергия передаётся по цепочке."],
];

export default function Method() {
  return (
    <div>
      <PageTitle eyebrow="Как это работает" title="ИИ видит, математика меряет, текст объясняет" lead="Мы честно разделяем, что делает нейросеть, а что — обычная геометрия. Поэтому каждую цифру можно проверить по кадру." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <Card key={title} className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime/12 text-lime">
                <Icon className="h-5 w-5" />
              </span>
              <span className="hud text-sm text-fog">0{i + 1}</span>
            </div>
            <p className="mt-4 font-display text-lg font-semibold">{title}</p>
            <p className="mt-2 text-sm text-fog">{text}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <Eyebrow>Что меряем</Eyebrow>
          <div className="mt-4 divide-y divide-white/5">
            {METRICS.map(([t, d]) => (
              <div key={t} className="py-3">
                <p className="font-semibold">{t}</p>
                <p className="mt-0.5 text-sm text-fog">{d}</p>
              </div>
            ))}
          </div>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <Eyebrow>Точность сейчас</Eyebrow>
            <p className="mt-3 text-sm text-chalk/85">
              На синтетических ударах с отмеченным мячом: момент удара — в пределах одного кадра, опорная нога — ±1,5 см, наклон корпуса — ±1,5°. Без отметки мяча
              колено и опора менее точны (до ±8° и ±8 см).
            </p>
            <p className="mt-3 text-sm text-fog">Проверку на реальных видео против ручной разметки в Kinovea проводим на пилоте. До этого не называем цифр точности для настоящих клипов.</p>
          </Card>
          <Card className="p-6">
            <Eyebrow className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Приватность и границы
            </Eyebrow>
            <ul className="mt-3 space-y-2 text-sm text-chalk/85">
              <li>Видео остаётся на устройстве, хранятся только координаты скелета.</li>
              <li>Никаких фамилий: ник и код команды.</li>
              <li>Мы не ставим диагнозов и не оцениваем риск травм — только технику.</li>
              <li>Оценка — это похожесть на эталон, а не приговор таланту.</li>
            </ul>
          </Card>
          <Card className="p-6">
            <Eyebrow className="flex items-center gap-2">
              <Brain className="h-4 w-4" /> Эталон
            </Eyebrow>
            <p className="mt-3 text-sm text-chalk/85">Сейчас эталон синтетический: 8 чистых ударов модели. Следующий шаг — эталон тренера из удачных ударов своих игроков; сервер это уже умеет, интерфейс будет на пилоте.</p>
          </Card>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <LinkButton to="/analyze" arrow>
          Разобрать удар
        </LinkButton>
        <LinkButton to="/demo" variant="glass">
          Демо-разбор
        </LinkButton>
      </div>
    </div>
  );
}
