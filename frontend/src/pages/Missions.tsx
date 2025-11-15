import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableList from "../components/TableList";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Mission } from "../types/models";
import Footer from "../components/Footer";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendiente" },
  { value: "IN_PROGRESS", label: "En progreso" },
  { value: "COMPLETED", label: "Completada" },
  { value: "ARCHIVED", label: "Archivada" },
];

export default function Missions() {
  const { token, user } = useAuth();
  const isSupervisor = user?.role === "supervisor";
  const [missions, setMissions] = useState<Mission[]>([]);
  const [form, setForm] = useState<Mission>({
    title: "",
    description: "",
    difficulty: "",
    status: "PENDING",
    assigned_to: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!token) return;
    try {
      const res = await apiFetch("/missions", "GET", undefined, token);
      setMissions(res || []);
    } catch (err) {
      console.error("Error al cargar misiones", err);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      difficulty: "",
      status: "PENDING",
      assigned_to: 0,
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isSupervisor) return;
    setError(null);

    try {
      const payload: Partial<Mission> = {
        title: form.title,
        description: form.description,
        difficulty: form.difficulty,
        assigned_to: Number(form.assigned_to) || 0,
      };
      if (editingId) {
        payload.status = form.status;
        await apiFetch(`/missions/${editingId}`, "PUT", payload, token);
      } else {
        await apiFetch("/missions", "POST", payload, token);
      }
      resetForm();
      await loadData();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "No se pudo guardar la misión";
      setError(message);
    }
  };

  const handleEdit = (item: Mission) => {
    if (!isSupervisor) return;
    setEditingId(item.id!);
    setForm({
      title: item.title,
      description: item.description,
      difficulty: item.difficulty,
      status: item.status ?? "PENDING",
      assigned_to: item.assigned_to,
    });
  };

  const handleDelete = async (id: number) => {
    if (!token || !isSupervisor) return;
    if (!confirm("¿Seguro que quieres eliminar esta misión?")) return;
    await apiFetch(`/missions/${id}`, "DELETE", undefined, token);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">
            Gestión de Misiones
          </h1>
          <p className="text-sm text-gray-600">
            {isSupervisor
              ? "Administra las tareas y asignaciones para los alquimistas."
              : "Consulta las misiones activas y su estado."}
          </p>
        </header>

        {isSupervisor && (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-4 rounded shadow flex flex-col gap-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Título"
                className="border p-2 rounded"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Dificultad (baja, media, alta)"
                className="border p-2 rounded"
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value })
                }
                required
              />
              <textarea
                placeholder="Descripción"
                className="border p-2 rounded md:col-span-2"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
              <input
                type="number"
                placeholder="ID del alquimista asignado"
                className="border p-2 rounded"
                value={form.assigned_to}
                onChange={(e) =>
                  setForm({ ...form, assigned_to: Number(e.target.value) || 0 })
                }
                min={0}
              />
              <select
                className="border p-2 rounded"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value as Mission["status"],
                  })
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex items-center gap-3">
              <button
                className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
                type="submit"
              >
                {editingId ? "Actualizar" : "Registrar"}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="text-sm text-gray-600 underline"
                  onClick={resetForm}
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        )}

        <div className="bg-white p-4 rounded shadow">
          <TableList
            columns={[
              "id",
              "title",
              "description",
              "difficulty",
              "status",
              "assigned_to",
            ]}
            data={missions.map((mission) => ({
              ...mission,
              status:
                STATUS_OPTIONS.find((opt) => opt.value === mission.status)
                  ?.label || mission.status,
            }))}
            onEdit={isSupervisor ? handleEdit : undefined}
            onDelete={isSupervisor ? handleDelete : undefined}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
