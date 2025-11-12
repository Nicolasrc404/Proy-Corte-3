import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import TableList from "../components/TableList";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Audit } from "../types/models";
import Footer from "../components/Footer";

export default function Audits() {
  const { token } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [form, setForm] = useState<Audit>({
    action: "",
    entity: "",
    entity_id: 0,
    user_email: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadData = async () => {
    const res = await apiFetch("/audits", "GET", undefined, token!);
    setAudits(res || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await apiFetch(`/audits/${editingId}`, "PUT", form, token!);
      setEditingId(null);
    } else {
      await apiFetch("/audits", "POST", form, token!);
    }
    setForm({ action: "", entity: "", entity_id: 0, user_email: "" });
    await loadData();
  };

  const handleEdit = (item: Audit) => {
    setEditingId(item.id!);
    setForm({
      action: item.action,
      entity: item.entity,
      entity_id: item.entity_id,
      user_email: item.user_email,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Seguro que quieres eliminar esta auditoría?")) {
      await apiFetch(`/audits/${id}`, "DELETE", undefined, token!);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          Registro de Auditorías
        </h1>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-white p-4 rounded shadow mb-6 flex flex-col gap-3"
        >
          <input
            type="text"
            placeholder="Acción (CREATE, UPDATE, DELETE...)"
            className="border p-2 rounded"
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="Entidad afectada (Alchemist, Material, etc.)"
            className="border p-2 rounded"
            value={form.entity}
            onChange={(e) => setForm({ ...form, entity: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="ID de la entidad"
            className="border p-2 rounded"
            value={form.entity_id}
            onChange={(e) =>
              setForm({ ...form, entity_id: parseInt(e.target.value) })
            }
            required
          />
          <input
            type="email"
            placeholder="Correo del usuario"
            className="border p-2 rounded"
            value={form.user_email}
            onChange={(e) => setForm({ ...form, user_email: e.target.value })}
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
          columns={["id", "action", "entity", "entity_id", "user_email"]}
          data={audits}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
      <Footer /> {/* ✅ agregado */}
    </div>
  );
}
