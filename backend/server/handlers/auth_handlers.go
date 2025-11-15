package handlers

import (
	"backend-avanzada/api"
	"backend-avanzada/models"
	"backend-avanzada/repository"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Claims del JWT
type AuthClaims struct {
	ID    uint   `json:"id"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Name  string `json:"name"`
	jwt.RegisteredClaims
}

// Handler principal
type AuthHandler struct {
	UserRepository repository.UserRepository
	Dispatcher     AsyncDispatcher
	Logger         func(status int, path string, start time.Time)
	HandleError    func(w http.ResponseWriter, statusCode int, path string, cause error)
	JWTSecret      string
}

// Constructor
func NewAuthHandler(jwtSecret string, ur repository.UserRepository,
	dispatcher AsyncDispatcher,
	handleError func(w http.ResponseWriter, statusCode int, path string, cause error),
	logger func(status int, path string, start time.Time)) *AuthHandler {

	return &AuthHandler{
		UserRepository: ur,
		Dispatcher:     dispatcher,
		JWTSecret:      jwtSecret,
		HandleError:    handleError,
		Logger:         logger,
	}
}

//////////////////////////////////////////////////////
// REGISTRO
//////////////////////////////////////////////////////

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	var req api.RegisterRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleError(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	// Validar campos
	req.Role = strings.ToLower(strings.TrimSpace(req.Role))
	if req.Name == "" || req.Specialty == "" || req.Email == "" || req.Password == "" || req.Role == "" {
		h.HandleError(w, http.StatusBadRequest, r.URL.Path,
			errors.New("name, specialty, email, password and role are required"))
		return
	}

	if req.Role != "alchemist" && req.Role != "supervisor" {
		h.HandleError(w, http.StatusBadRequest, r.URL.Path, errors.New("invalid role"))
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

	if h.Dispatcher != nil {
		if err := h.Dispatcher.EnqueueAudit("user_registered", "user", u.ID, u.Email, "New account created"); err != nil {
			h.Logger(http.StatusInternalServerError, r.URL.Path, start)
		}
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
	h.Logger(http.StatusCreated, r.URL.Path, start)
}

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
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
		ID:    u.ID,
		Email: u.Email,
		Role:  u.Role,
		Name:  u.Name,
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

	if h.Dispatcher != nil {
		if err := h.Dispatcher.EnqueueAudit("user_login", "user", u.ID, u.Email, "User signed in"); err != nil {
			h.Logger(http.StatusInternalServerError, r.URL.Path, start)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
	h.Logger(http.StatusOK, r.URL.Path, start)
}
