import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableList from "../components/TableList";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Mission } from "../types/models";
import Footer from "../components/Footer";

export default function Missions() {
  const { token } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [form, setForm] = useState<Mission>({
    title: "",
    description: "",
    difficulty: "",
    assigned_to: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = async () => {
    const res = await apiFetch("/missions", "GET", undefined, token!);
    setMissions(res || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await apiFetch(`/missions/${editingId}`, "PUT", form, token!);
      setEditingId(null);
    } else {
      await apiFetch("/missions", "POST", form, token!);
    }
    setForm({ title: "", description: "", difficulty: "", assigned_to: 0 });
    await loadData();
  };

  const handleEdit = (item: Mission) => {
    setEditingId(item.id!);
    setForm({
      title: item.title,
      description: item.description,
      difficulty: item.difficulty,
      assigned_to: item.assigned_to,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Seguro que quieres eliminar esta misión?")) {
      await apiFetch(`/missions/${id}`, "DELETE", undefined, token!);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Gestión de Misiones
        </h1>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-3"
        >
          <input
            type="text"
            placeholder="Título"
            className="border p-2 rounded"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <textarea
            placeholder="Descripción"
            className="border p-2 rounded"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Dificultad (baja, media, alta)"
            className="border p-2 rounded"
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="ID del alquimista asignado"
            className="border p-2 rounded"
            value={form.assigned_to}
            onChange={(e) =>
              setForm({ ...form, assigned_to: parseInt(e.target.value) })
            }
            required
          />

          <button
            className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
            type="submit"
          >
            {editingId ? "Actualizar" : "Registrar"}
          </button>
        </form>

        {/* Tabla */}
        <TableList
          columns={[
            "id",
            "title",
            "description",
            "difficulty",
            "status",
            "assigned_to",
          ]}
          data={missions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      <Footer /> {/* ✅ agregado */}
    </div>
  );
}
