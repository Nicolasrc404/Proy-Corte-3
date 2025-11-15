package handlers

import (
	"backend-avanzada/api"
	"backend-avanzada/models"
	"backend-avanzada/repository"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Claims del JWT
type AuthClaims struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	jwt.RegisteredClaims
}

// Handler principal
type AuthHandler struct {
	UserRepository repository.UserRepository
	Logger         func(status int, path string, start time.Time)
	HandleError    func(w http.ResponseWriter, statusCode int, path string, cause error)
	JWTSecret      string
}

// Constructor
func NewAuthHandler(jwtSecret string, ur repository.UserRepository,
	handleError func(w http.ResponseWriter, statusCode int, path string, cause error),
	logger func(status int, path string, start time.Time)) *AuthHandler {

	return &AuthHandler{
		UserRepository: ur,
		JWTSecret:      jwtSecret,
		HandleError:    handleError,
		Logger:         logger,
	}
}

//////////////////////////////////////////////////////
// REGISTRO
//////////////////////////////////////////////////////

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req api.RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleError(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	// Validar campos
	if req.Name == "" || req.Specialty == "" || req.Email == "" || req.Password == "" || req.Role == "" {
		h.HandleError(w, http.StatusBadRequest, r.URL.Path,
			errors.New("name, specialty, email, password and role are required"))
		return
	}

	// Verificar si ya existe el email
	exists, err := h.UserRepository.FindByEmail(req.Email)
	if err != nil {
		h.HandleError(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if exists != nil {
		h.HandleError(w, http.StatusConflict, r.URL.Path, errors.New("email already registered"))
		return
	}

	// Encriptar contraseña
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.HandleError(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}

	// Crear el usuario
	u := &models.User{
		Name:         req.Name,
		Specialty:    req.Specialty,
		Email:        req.Email,
		PasswordHash: string(hash),
		Role:         req.Role,
	}

	_, err = h.UserRepository.Save(u)
	if err != nil {
		h.HandleError(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}

	// RESPUESTA COMPLETA DEL REGISTRO
	resp := api.AuthResponse{
		ID:        u.ID,
		Name:      u.Name,
		Specialty: u.Specialty,
		Email:     u.Email,
		Role:      u.Role,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req api.LoginRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleError(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	u, err := h.UserRepository.FindByEmail(req.Email)
	if err != nil {
		h.HandleError(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if u == nil {
		h.HandleError(w, http.StatusUnauthorized, r.URL.Path, errors.New("invalid credentials"))
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		h.HandleError(w, http.StatusUnauthorized, r.URL.Path, errors.New("invalid credentials"))
		return
	}

	// Crear token JWT
	now := time.Now()
	claims := &AuthClaims{
		Email: u.Email,
		Role:  u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(2 * time.Hour)),
			Issuer:    "alchemist-system",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(h.JWTSecret))
	if err != nil {
		h.HandleError(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}

	// RESPUESTA COMPLETA DEL LOGIN
	resp := api.AuthResponse{
		Token:     tokenString,
		ID:        u.ID,
		Name:      u.Name,
		Specialty: u.Specialty,
		Email:     u.Email,
		Role:      u.Role,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
