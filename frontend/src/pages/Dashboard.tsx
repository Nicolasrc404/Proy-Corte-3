import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Alchemist,
  Mission,
  Material,
  Transmutation,
  Audit,
} from "../types/models";
import { Link } from "react-router-dom";
import { API_URL } from "../config";

const PIE_COLORS = ["#3b82f6", "#22c55e", "#f97316", "#ef4444", "#a855f7"];

type PieDatum = { status: string; value: number };

type BarDatum = { label: string; value: number };

type MaterialDatum = { name: string; quantity: number };

const formatPieGradient = (data: PieDatum[]) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return "conic-gradient(#e5e7eb 0deg, #e5e7eb 360deg)";
  }

  let accumulated = 0;
  const segments = data.map((item, index) => {
    const start = (accumulated / total) * 360;
    accumulated += item.value;
    const end = (accumulated / total) * 360;
    const color = PIE_COLORS[index % PIE_COLORS.length];
    return `${color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${segments.join(", ")})`;
};

const PieLegend = ({ data }: { data: PieDatum[] }) => (
  <ul className="mt-4 space-y-2 text-sm text-gray-600">
    {data.map((item, index) => (
      <li key={item.status} className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full"
          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
        />
        <span className="font-medium text-gray-700">{item.status}</span>
        <span className="text-gray-500">({item.value})</span>
      </li>
    ))}
  </ul>
);

const SimpleColumnChart = ({ data }: { data: BarDatum[] }) => {
  const maxValue =
    data.reduce((max, item) => Math.max(max, item.value), 0) || 1;
  return (
    <div className="h-64 flex items-end gap-4">
      {data.map((item, index) => {
        const height = `${Math.round((item.value / maxValue) * 100)}%`;
        const color = PIE_COLORS[index % PIE_COLORS.length];
        return (
          <div key={item.label} className="flex-1 min-w-[56px]">
            <div
              className="mx-auto w-12 rounded-t-md"
              style={{
                backgroundColor: color,
                height,
                minHeight: "0.5rem",
              }}
              title={`${item.label}: ${item.value}`}
            />
            <div className="mt-2 text-xs font-medium text-center text-gray-600 break-words">
              {item.label}
            </div>
            <div className="text-xs text-center text-gray-500">
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HorizontalBarList = ({ data }: { data: MaterialDatum[] }) => {
  const maxValue =
    data.reduce((max, item) => Math.max(max, item.quantity), 0) || 1;
  return (
    <div className="space-y-4">
      {data.map((item) => {
        const width = `${Math.round((item.quantity / maxValue) * 100)}%`;
        return (
          <div key={item.name} className="flex items-center gap-3">
            <span
              className="w-32 text-sm font-medium text-gray-700 truncate"
              title={item.name}
            >
              {item.name}
            </span>
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width }}
                title={`${item.name}: ${item.quantity}`}
              />
            </div>
            <span className="text-sm text-gray-600">
              {item.quantity.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function Dashboard() {
  const { token, user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transmutations, setTransmutations] = useState<Transmutation[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [alchemists, setAlchemists] = useState<Alchemist[]>([]);

  const loadMissions = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Mission[]>(
        "/missions",
        "GET",
        undefined,
        token
      );
      setMissions(data ?? []);
    } catch (err) {
      console.error("Error loading missions", err);
    }
  };

  const loadMaterials = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Material[]>(
        "/materials",
        "GET",
        undefined,
        token
      );
      setMaterials(data ?? []);
    } catch (err) {
      console.error("Error loading materials", err);
    }
  };

  const loadTransmutations = async () => {
    if (!token) return;
    try {
      const data = await apiFetch<Transmutation[]>(
        "/transmutations",
        "GET",
        undefined,
        token
      );
      setTransmutations(data ?? []);
    } catch (err) {
      console.error("Error loading transmutations", err);
    }
  };

  const loadAudits = async () => {
    if (!token || user?.role !== "supervisor") return;
    try {
      const data = await apiFetch<Audit[]>("/audits", "GET", undefined, token);
      setAudits(data ?? []);
    } catch (err) {
      console.error("Error loading audits", err);
    }
  };

  const loadAlchemists = async () => {
    if (!token || user?.role !== "supervisor") return;
    try {
      const data = await apiFetch<Alchemist[]>(
        "/alchemists",
        "GET",
        undefined,
        token
      );
      setAlchemists(data ?? []);
    } catch (err) {
      console.error("Error loading alchemists", err);
    }
  };

  const loadAll = async () => {
    await Promise.all([
      loadMissions(),
      loadMaterials(),
      loadTransmutations(),
      loadAudits(),
      loadAlchemists(),
    ]);
  };

  useEffect(() => {
    loadAll();
  }, [token, user?.role]);

  useEffect(() => {
    if (!token) return;
    const source = new EventSource(
      `${API_URL}/events?token=${encodeURIComponent(token)}`
    );

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        switch (payload.type) {
          case "transmutation.updated":
          case "transmutation.deleted":
            loadTransmutations();
            break;
          case "audit.created":
            if (user?.role === "supervisor") {
              loadAudits();
            }
            break;
          case "mission_updated":
          case "mission_created":
            loadMissions();
            break;
          default:
            break;
        }
      } catch (err) {
        console.error("Error parsing SSE payload", err);
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [token, user?.role]);

  const missionStatusData = useMemo(() => {
    const totals: Record<string, number> = {};
    missions.forEach((mission) => {
      const key = mission.status ?? "DESCONOCIDO";
      totals[key] = (totals[key] ?? 0) + 1;
    });
    return Object.entries(totals).map(([status, value]) => ({
      status,
      value,
    }));
  }, [missions]);

  const transmutationStatusData = useMemo(() => {
    const totals: Record<string, number> = {};
    transmutations.forEach((t) => {
      const key = t.status ?? "PENDING";
      totals[key] = (totals[key] ?? 0) + 1;
    });
    return Object.entries(totals).map(([status, value]) => ({
      label: status,
      value,
    }));
  }, [transmutations]);

  const materialQuantityData = useMemo<MaterialDatum[]>(
    () =>
      materials
        .map((material) => ({
          name: material.name,
          quantity: Number(material.quantity.toFixed(2)),
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 8),
    [materials]
  );

  const cards = useMemo(() => {
    const base = [
      {
        title: "Misiones",
        path: "/missions",
        value: missions.length,
        color: "bg-blue-500",
      },
      {
        title: "Materiales",
        path: "/materials",
        value: materials.length,
        color: "bg-green-500",
      },
      {
        title: "Transmutaciones",
        path: "/transmutations",
        value: transmutations.length,
        color: "bg-yellow-500",
      },
    ];

    if (user?.role === "supervisor") {
      base.unshift({
        title: "Alquimistas",
        path: "/alchemists",
        value: alchemists.length,
        color: "bg-indigo-500",
      });
      base.push({
        title: "Auditorías",
        path: "/audits",
        value: audits.length,
        color: "bg-red-500",
      });
    }
    return base;
  }, [
    missions.length,
    materials.length,
    transmutations.length,
    audits.length,
    alchemists.length,
    user?.role,
  ]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Panel de Control
            </h1>
            {user?.specialty && (
              <p className="text-sm text-gray-500">
                Especialidad: {user.specialty}
              </p>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Última actualización: {new Date().toLocaleString()}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              to={card.path}
              key={card.title}
              className={`${card.color} text-white rounded-lg shadow-lg p-6 hover:opacity-90 transition`}
            >
              <h2 className="text-lg font-semibold">{card.title}</h2>
              <p className="text-4xl font-bold mt-2">{card.value}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Misiones por estado</h3>
            {missionStatusData.length === 0 ? (
              <p className="text-sm text-gray-500">
                No hay misiones registradas.
              </p>
            ) : (
              <>
                <div
                  className="w-48 h-48 mx-auto rounded-full shadow-inner"
                  style={{ background: formatPieGradient(missionStatusData) }}
                  role="img"
                  aria-label="Distribución de misiones por estado"
                />
                <PieLegend data={missionStatusData} />
              </>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Transmutaciones por estado
            </h3>
            {transmutationStatusData.length === 0 ? (
              <p className="text-sm text-gray-500">
                Aún no hay transmutaciones registradas.
              </p>
            ) : (
              <SimpleColumnChart data={transmutationStatusData} />
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            Inventario de materiales disponibles
          </h3>
          {materialQuantityData.length === 0 ? (
            <p className="text-sm text-gray-500">
              No hay materiales registrados en el sistema.
            </p>
          ) : (
            <HorizontalBarList data={materialQuantityData} />
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
