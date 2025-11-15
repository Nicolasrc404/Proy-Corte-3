import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Audit } from "../types/models";
import Footer from "../components/Footer";
import { API_URL } from "../config";

export default function Audits() {
  const { token } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);

  const loadAudits = async () => {
    if (!token) return;
    const res = await apiFetch("/audits", "GET", undefined, token);
    setAudits(res || []);
  };

  useEffect(() => {
    loadAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    const source = new EventSource(
      `${API_URL}/events?token=${encodeURIComponent(token)}`
    );

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (
          payload.type === "audit.created" ||
          payload.type === "audit.updated"
        ) {
          loadAudits();
        }
      } catch (err) {
        console.error("Error procesando evento de auditoría", err);
      }
    };

    source.onerror = () => source.close();

    return () => {
      source.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">
            Auditorías del sistema
          </h1>
          <p className="text-sm text-gray-600">
            Registro de eventos críticos generados automáticamente por el
            backend.
          </p>
        </header>

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Acción</th>
                <th className="p-3 text-left">Entidad</th>
                <th className="p-3 text-left">Detalle</th>
                <th className="p-3 text-left">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No hay eventos registrados todavía.
                  </td>
                </tr>
              ) : (
                audits
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.created_at || 0).getTime() -
                      new Date(a.created_at || 0).getTime()
                  )
                  .map((audit) => (
                    <tr key={audit.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-gray-500">
                        {audit.created_at
                          ? new Date(audit.created_at).toLocaleString()
                          : "-"}
                      </td>
                      <td className="p-3 font-semibold uppercase">
                        {audit.action}
                      </td>
                      <td className="p-3">{audit.entity}</td>
                      <td className="p-3 text-gray-700">
                        {audit.details || `ID afectado: ${audit.entity_id}`}
                      </td>
                      <td className="p-3 text-gray-500">{audit.user_email}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Footer />
    </div>
  );
}
