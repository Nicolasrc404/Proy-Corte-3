import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Transmutation, Material } from "../types/models";
import Footer from "../components/Footer";
import { API_URL } from "../config";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  PROCESSING: "Procesando",
  COMPLETED: "Completada",
  FAILED: "Fallida",
};

export default function Transmutations() {
  const { token, user } = useAuth();
  const [transmutations, setTransmutations] = useState<Transmutation[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState({
    material_id: "",
    quantity: "",
    formula: "",
    user_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransmutations = async () => {
    if (!token) return;
    try {
      const data = await apiFetch("/transmutations", "GET", undefined, token);
      setTransmutations(data ?? []);
    } catch (err) {
      console.error("Error cargando transmutaciones", err);
    }
  };

  const loadMaterials = async () => {
    if (!token) return;
    try {
      const data = await apiFetch("/materials", "GET", undefined, token);
      setMaterials(data ?? []);
    } catch (err) {
      console.error("Error cargando materiales", err);
    }
  };

  useEffect(() => {
    loadTransmutations();
    loadMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.role]);

  useEffect(() => {
    if (!token) return;
    const source = new EventSource(
      `${API_URL}/events?token=${encodeURIComponent(token)}`
    );

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === "transmutation.updated" ||
          payload.type === "transmutation.deleted"
        ) {
          loadTransmutations();
        }
      } catch (err) {
        console.error("Error procesando evento SSE", err);
      }
    };

    source.onerror = () => source.close();

    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        material_id: Number(form.material_id),
        quantity: Number(form.quantity),
      };
      if (form.formula.trim()) {
        payload.formula = form.formula.trim();
      }
      if (user?.role === "supervisor" && form.user_id) {
        payload.user_id = Number(form.user_id);
      }
      await apiFetch("/transmutations", "POST", payload, token);
      setForm({ material_id: "", quantity: "", formula: "", user_id: "" });
      await loadTransmutations();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || user?.role !== "supervisor") return;
    if (!confirm("¿Seguro que quieres eliminar esta transmutación?")) return;
    try {
      await apiFetch(`/transmutations/${id}`, "DELETE", undefined, token);
      await loadTransmutations();
    } catch (err) {
      alert("No se pudo eliminar la transmutación");
    }
  };

  const materialOptions = useMemo(() => {
    return materials.map((material) => ({
      value: String(material.id),
      label: material.name,
    }));
  }, [materials]);

  const isSupervisor = user?.role === "supervisor";

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Registro de Transmutaciones
            </h1>
            <p className="text-sm text-gray-600">
              Crea y monitorea las transmutaciones{" "}
              {isSupervisor ? "de toda la orden" : "asignadas a tu laboratorio"}
              .
            </p>
          </div>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow flex flex-col gap-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="border p-2 rounded"
              value={form.material_id}
              onChange={(e) =>
                setForm({ ...form, material_id: e.target.value })
              }
              required
            >
              <option value="">Selecciona un material</option>
              {materialOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0.01}
              step="0.01"
              placeholder="Cantidad utilizada"
              className="border p-2 rounded"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />

            <input
              type="text"
              placeholder="Fórmula alquímica (opcional)"
              className="border p-2 rounded md:col-span-2"
              value={form.formula}
              onChange={(e) => setForm({ ...form, formula: e.target.value })}
            />

            {isSupervisor && (
              <input
                type="number"
                min={1}
                placeholder="ID de usuario (opcional)"
                className="border p-2 rounded"
                value={form.user_id}
                onChange={(e) => setForm({ ...form, user_id: e.target.value })}
              />
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700 disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Enviando..." : "Registrar transmutación"}
          </button>
        </form>

        <section className="bg-white rounded shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Material</th>
                <th className="p-3 text-left">Cantidad</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-left">Resultado</th>
                <th className="p-3 text-left">Actualizado</th>
                {isSupervisor && <th className="p-3 text-left">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {transmutations.length === 0 ? (
                <tr>
                  <td
                    colSpan={isSupervisor ? 7 : 6}
                    className="p-4 text-center text-gray-500"
                  >
                    Aún no hay transmutaciones registradas.
                  </td>
                </tr>
              ) : (
                transmutations.map((t) => {
                  const material = materials.find(
                    (m) => m.id === t.material_id
                  );
                  const statusLabel =
                    STATUS_LABELS[t.status ?? "PENDING"] || t.status;
                  return (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{t.id}</td>
                      <td className="p-3">{material?.name ?? t.material_id}</td>
                      <td className="p-3">{t.quantity}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="p-3 text-gray-700">
                        {t.result || "En espera"}
                      </td>
                      <td className="p-3 text-gray-500">
                        {t.updated_at
                          ? new Date(t.updated_at).toLocaleString()
                          : t.created_at
                          ? new Date(t.created_at).toLocaleString()
                          : "-"}
                      </td>
                      {isSupervisor && (
                        <td className="p-3">
                          <button
                            onClick={() => handleDelete(t.id!)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          >
                            Eliminar
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>
      <Footer />
    </div>
  );
}
