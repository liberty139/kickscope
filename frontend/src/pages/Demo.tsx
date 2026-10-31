import { useQuery } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import { Empty, LinkButton } from "../components/ui";
import { api } from "../lib/api";

/** Opens the featured demo kick (a clear fault, an obvious ghost difference). */
export default function Demo() {
  const q = useQuery({ queryKey: ["demo"], queryFn: api.demo });
  if (q.data?.featured) return <Navigate to={`/result/${q.data.featured}`} replace />;
  if (q.isError)
    return (
      <Empty title="Демо недоступно" text="Сервер не отвечает. Попробуй через минуту.">
        <LinkButton to="/">На главную</LinkButton>
      </Empty>
    );
  return <div className="py-24 text-center text-fog">Открываю демо-разбор…</div>;
}
