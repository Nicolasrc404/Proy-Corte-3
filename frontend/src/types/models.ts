// * Authentication

export interface User {
  id: number;
  name: string;
  email: string;
  specialty?: string;
  role: "alchemist" | "supervisor";
}

// * Alchemist

export interface Alchemist {
  id?: number;
  name: string;
  age: number;
  specialty: string;
  rank: string;
  created_at?: string;
}

// * Mission

export interface Mission {
  id?: number;
  title: string;
  description: string;
  difficulty: "baja" | "media" | "alta" | string;
  status?: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED" | string;
  assigned_to: number;
  created_at?: string;
}

// * Material

export interface Material {
  id?: number;
  name: string;
  category: string;
  quantity: number;
  created_at?: string;
}

// *Transmutation

export interface Transmutation {
  id?: number;
  user_id: number;
  material_id: number;
  quantity: number;
  formula?: string;
  status?: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | string;
  result?: string;
  created_at?: string;
  updated_at?: string;
}

// * Audit
export interface Audit {
  id?: number;
  action: string;
  entity: string;
  entity_id: number;
  user_email: string;
  details?: string;
  created_at?: string;
}
