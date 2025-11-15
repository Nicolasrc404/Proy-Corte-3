import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableList from "../components/TableList";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Material } from "../types/models";
import Footer from "../components/Footer";

export default function Materials() {
  const { token, user } = useAuth();
  const isSupervisor = user?.role === "supervisor";
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState<Material>({
    name: "",
    category: "",
    quantity: 0,
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = async () => {
    if (!token) return;
    const res = await apiFetch<Material[]>(
      "/materials",
      "GET",
      undefined,
      token
    );
    setMaterials(res || []);
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const resetForm = () => {
    setForm({ name: "", category: "", quantity: 0 });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isSupervisor) return;

    const payload = {
      name: form.name,
      category: form.category,
      quantity: Number(form.quantity),
    };

    if (editingId) {
      await apiFetch(`/materials/${editingId}`, "PUT", payload, token);
    } else {
      await apiFetch("/materials", "POST", payload, token);
    }

    resetForm();
    await loadData();
  };

  const handleEdit = (item: Material) => {
    if (!isSupervisor) return;
    setEditingId(item.id!);
    setForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity,
    });
  };

  const handleDelete = async (id: number) => {
    if (!token || !isSupervisor) return;
    if (!confirm("¿Seguro que quieres eliminar este material?")) return;
    await apiFetch(`/materials/${id}`, "DELETE", undefined, token);
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">
            Gestión de Materiales
          </h1>
          <p className="text-sm text-gray-600">
            {isSupervisor
              ? "Registra y controla los recursos alquímicos disponibles."
              : "Consulta los materiales disponibles para tus transmutaciones."}
          </p>
        </header>

        {isSupervisor && (
          <form
            onSubmit={handleSubmit}
            className="bg-white p-4 rounded shadow flex flex-col gap-3"
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
              min={0}
              placeholder="Cantidad disponible"
              className="border p-2 rounded"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: Number(e.target.value) || 0 })
              }
              required
            />

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
            columns={["id", "name", "category", "quantity"]}
            data={materials.map((item) => ({
              ...item,
              quantity: Number(item.quantity.toFixed(2)),
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
