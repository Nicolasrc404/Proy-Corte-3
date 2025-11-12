import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import Footer from "../components/Footer";
import {
  Alchemist,
  Mission,
  Material,
  Transmutation,
  Audit,
} from "../types/models";

export default function Dashboard() {
  const { token, user } = useAuth();

  const [totals, setTotals] = useState({
    alchemists: 0,
    missions: 0,
    materials: 0,
    transmutations: 0,
    audits: 0,
  });

  const loadData = async () => {
    const results: any = {};
    try {
      if (user?.role === "supervisor") {
        const alc = await apiFetch("/alchemists", "GET", undefined, token!);
        results.alchemists = alc.length;
      }
      const mis = await apiFetch("/missions", "GET", undefined, token!);
      const mat = await apiFetch("/materials", "GET", undefined, token!);
      const tra = await apiFetch("/transmutations", "GET", undefined, token!);
      results.missions = mis.length;
      results.materials = mat.length;
      results.transmutations = tra.length;

      if (user?.role === "supervisor") {
        const aud = await apiFetch("/audits", "GET", undefined, token!);
        results.audits = aud.length;
      }

      setTotals((prev) => ({ ...prev, ...results }));
    } catch (err) {
      console.error("Error al cargar datos del Dashboard", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cards = [
    user?.role === "supervisor" && {
      title: "Alquimistas",
      path: "/alchemists",
      value: totals.alchemists,
      color: "bg-indigo-500",
    },
    {
      title: "Misiones",
      path: "/missions",
      value: totals.missions,
      color: "bg-blue-500",
    },
    {
      title: "Materiales",
      path: "/materials",
      value: totals.materials,
      color: "bg-green-500",
    },
    {
      title: "Transmutaciones",
      path: "/transmutations",
      value: totals.transmutations,
      color: "bg-yellow-500",
    },
    user?.role === "supervisor" && {
      title: "Auditorías",
      path: "/audits",
      value: totals.audits,
      color: "bg-red-500",
    },
  ].filter(Boolean) as {
    title: string;
    path: string;
    value: number;
    color: string;
  }[];

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Panel de Control
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {cards.map((c) => (
            <Link
              to={c.path}
              key={c.title}
              className={`${c.color} text-white rounded-lg shadow-lg p-6 hover:opacity-90 transition`}
            >
              <h2 className="text-lg font-semibold">{c.title}</h2>
              <p className="text-4xl font-bold mt-2">{c.value}</p>
            </Link>
          ))}
        </div>
      </div>
      <Footer /> {/* ✅ pie de página agregado */}
    </div>
  );
}
