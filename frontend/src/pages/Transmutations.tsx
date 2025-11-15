import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableList from "../components/TableList";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Transmutation } from "../types/models";
import Footer from "../components/Footer";

export default function Transmutations() {
  const { token } = useAuth();
  const [transmutations, setTransmutations] = useState<Transmutation[]>([]);
  const [form, setForm] = useState<Transmutation>({
    user_id: 0,
    material_id: 0,
    quantity: 0,
    formula: "",
    result: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = async () => {
    const res = await apiFetch("/transmutations", "GET", undefined, token!);
    setTransmutations(res || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await apiFetch(`/transmutations/${editingId}`, "PUT", form, token!);
      setEditingId(null);
    } else {
      await apiFetch("/transmutations", "POST", form, token!);
    }
    setForm({
      user_id: 0,
      material_id: 0,
      quantity: 0,
      formula: "",
      result: "",
    });
    await loadData();
  };

  const handleEdit = (item: Transmutation) => {
    setEditingId(item.id!);
    setForm({
      user_id: item.user_id,
      material_id: item.material_id,
      quantity: item.quantity,
      formula: item.formula || "",
      result: item.result || "",
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Seguro que quieres eliminar esta transmutación?")) {
      await apiFetch(`/transmutations/${id}`, "DELETE", undefined, token!);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Registro de Transmutaciones
        </h1>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-3"
        >
          <input
            type="number"
            placeholder="ID del Usuario"
            className="border p-2 rounded"
            value={form.user_id}
            onChange={(e) =>
              setForm({ ...form, user_id: parseInt(e.target.value) || 0 })
            }
            required
          />
          <input
            type="number"
            placeholder="ID del Material"
            className="border p-2 rounded"
            value={form.material_id}
            onChange={(e) =>
              setForm({ ...form, material_id: parseInt(e.target.value) || 0 })
            }
            required
          />
          <input
            type="number"
            placeholder="Cantidad utilizada"
            className="border p-2 rounded"
            value={form.quantity}
            min={0}
            step="0.01"
            onChange={(e) =>
              setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })
            }
            required
          />
          <input
            type="text"
            placeholder="Fórmula alquímica (opcional)"
            className="border p-2 rounded"
            value={form.formula}
            onChange={(e) => setForm({ ...form, formula: e.target.value })}
          />
          <input
            type="text"
            placeholder="Resultado o estado"
            className="border p-2 rounded"
            value={form.result}
            onChange={(e) => setForm({ ...form, result: e.target.value })}
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
            "user_id",
            "material_id",
            "quantity",
            "status",
            "result",
          ]}
          data={transmutations}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      <Footer /> {/* ✅ agregado */}
    </div>
  );
}
