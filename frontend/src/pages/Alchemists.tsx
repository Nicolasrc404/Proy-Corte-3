import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableList from "../components/TableList";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Alchemist } from "../types/models";
import Footer from "../components/Footer";

export default function Alchemists() {
  const { token } = useAuth();
  const [alchemists, setAlchemists] = useState<Alchemist[]>([]);
  const [form, setForm] = useState<Alchemist>({
    name: "",
    age: 0,
    specialty: "",
    rank: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Cargar lista inicial
  const loadData = async () => {
    const res = await apiFetch<Alchemist[]>(
      "/alchemists",
      "GET",
      undefined,
      token!
    );
    setAlchemists(res || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      await apiFetch(`/alchemists/${editingId}`, "PUT", form, token!);
      setEditingId(null);
    } else {
      await apiFetch("/alchemists", "POST", form, token!);
    }

    setForm({ name: "", age: 0, specialty: "", rank: "" });
    await loadData();
  };

  // Editar registro
  const handleEdit = (item: Alchemist) => {
    setEditingId(item.id!);
    setForm({
      name: item.name,
      age: item.age,
      specialty: item.specialty,
      rank: item.rank,
    });
  };

  // Eliminar registro
  const handleDelete = async (id: number) => {
    if (confirm("¿Seguro que quieres eliminar este alquimista?")) {
      await apiFetch(`/alchemists/${id}`, "DELETE", undefined, token!);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Gestión de Alquimistas
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-3"
        >
          <input
            type="text"
            placeholder="Nombre"
            className="border p-2 rounded"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Edad"
            className="border p-2 rounded"
            value={form.age}
            onChange={(e) =>
              setForm({ ...form, age: parseInt(e.target.value) })
            }
            required
          />
          <input
            type="text"
            placeholder="Especialidad"
            className="border p-2 rounded"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Rango"
            className="border p-2 rounded"
            value={form.rank}
            onChange={(e) => setForm({ ...form, rank: e.target.value })}
            required
          />

          <button
            className="bg-blue-600 text-white rounded p-2 hover:bg-blue-700"
            type="submit"
          >
            {editingId ? "Actualizar" : "Registrar"}
          </button>
        </form>

        <TableList
          columns={["id", "name", "age", "specialty", "rank"]}
          data={alchemists}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      <Footer />
    </div>
  );
}
