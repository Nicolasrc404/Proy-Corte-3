import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableList from "../components/TableList";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Material } from "../types/models";
import Footer from "../components/Footer";

export default function Materials() {
  const { token } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState<Material>({
    name: "",
    category: "",
    quantity: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = async () => {
    const res = await apiFetch("/materials", "GET", undefined, token!);
    setMaterials(res || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await apiFetch(`/materials/${editingId}`, "PUT", form, token!);
      setEditingId(null);
    } else {
      await apiFetch("/materials", "POST", form, token!);
    }
    setForm({ name: "", category: "", quantity: 0 });
    await loadData();
  };

  const handleEdit = (item: Material) => {
    setEditingId(item.id!);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Seguro que quieres eliminar este material?")) {
      await apiFetch(`/materials/${id}`, "DELETE", undefined, token!);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Gestión de Materiales
        </h1>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-3"
        >
          <input
            type="text"
            placeholder="Nombre del material"
            className="border p-2 rounded"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Categoría (Metal, Mineral, etc.)"
            className="border p-2 rounded"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Cantidad disponible"
            className="border p-2 rounded"
            value={form.quantity}
            onChange={(e) =>
              setForm({ ...form, quantity: parseFloat(e.target.value) })
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
          columns={["id", "name", "category", "quantity"]}
          data={materials}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      <Footer /> {/* ✅ agregado */}
    </div>
  );
}
