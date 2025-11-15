package api

type RegisterRequest struct {
	Name      string `json:"name"`
	Specialty string `json:"specialty"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Role      string `json:"role"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token     string `json:"token,omitempty"`
	ID        uint   `json:"id,omitempty"`
	Name      string `json:"name,omitempty"`
	Specialty string `json:"specialty,omitempty"`
	Email     string `json:"email,omitempty"`
	Role      string `json:"role,omitempty"`
}
