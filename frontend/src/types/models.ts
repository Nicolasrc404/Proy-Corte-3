// ===============================
// 🔐 Autenticación
// ===============================

export interface User {
  email: string;
  role: "alchemist" | "supervisor";
}

// ===============================
// ⚗️ Alchemist
// ===============================

export interface Alchemist {
  id?: number;
  name: string;
  age: number;
  specialty: string;
  rank: string;
  created_at?: string;
}

// ===============================
// 🎯 Mission
// ===============================

export interface Mission {
  id?: number;
  title: string;
  description: string;
  difficulty: "baja" | "media" | "alta" | string;
  status?: "pendiente" | "en_progreso" | "completada" | string;
  assigned_to: number; // id del alquimista
  created_at?: string;
}

// ===============================
// ⚙️ Material
// ===============================

export interface Material {
  id?: number;
  name: string;
  category: string;
  quantity: number;
  created_at?: string;
}

// ===============================
// 🔮 Transmutation
// ===============================

export interface Transmutation {
  id?: number;
  alchemist_id: number;
  material_id: number;
  formula?: string;
  status?: "en_proceso" | "completada" | "fallida" | string;
  result?: string;
  created_at?: string;
}

// ===============================
// 🕵️ Audit
// ===============================

export interface Audit {
  id?: number;
  action: "CREATE" | "UPDATE" | "DELETE" | string;
  entity: string; // nombre de la entidad afectada
  entity_id: number;
  user_email: string;
  created_at?: string;
}
