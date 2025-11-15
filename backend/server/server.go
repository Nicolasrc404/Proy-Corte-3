package server

import (
	"backend-avanzada/config"
	"backend-avanzada/logger"
	"backend-avanzada/models"
	"backend-avanzada/repository"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/handlers"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// Server representa el servidor principal de la aplicación.
type Server struct {
	DB                      *gorm.DB
	Config                  *config.Config
	Handler                 http.Handler
	UserRepository          repository.UserRepository
	AlchemistRepository     *repository.AlchemistRepository
	MissionRepository       *repository.MissionRepository
	MaterialRepository      *repository.MaterialRepository
	TransmutationRepository *repository.TransmutationRepository
	AuditRepository         *repository.AuditRepository
	jwtSecret               string
	logger                  *logger.Logger
	taskQueue               *TaskQueue
	eventHub                *EventHub
}

type welcomePayload struct {
	Role  string `json:"role"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

type welcomeMessage struct {
	Type      string         `json:"type"`
	Payload   welcomePayload `json:"payload"`
	Timestamp string         `json:"timestamp"`
}

// NewServer inicializa la instancia del servidor.
func NewServer() *Server {
	s := &Server{
		logger:   logger.NewLogger(),
		eventHub: NewEventHub(),
	}
	var cfg config.Config
	configFile, err := os.ReadFile("config/config.json")
	if err != nil {
		s.logger.Fatal(err)
	}
	if err := json.Unmarshal(configFile, &cfg); err != nil {
		s.logger.Fatal(err)
	}
	s.Config = &cfg

	// Cargar secreto JWT desde .env
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		s.logger.Fatal(fmt.Errorf("JWT_SECRET is not set in environment"))
	}
	s.jwtSecret = secret

	return s
}

// StartServer arranca el servidor HTTP.
func (s *Server) StartServer() {
	fmt.Println("Inicializando base de datos...")
	s.initDB()
	if err := s.initAsyncInfrastructure(); err != nil {
		s.logger.Fatal(err)
	}

	fmt.Println("Configurando CORS...")
	corsObj := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}),
		handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"}),
	)

	fmt.Println("Inicializando mux...")
	srv := &http.Server{
		Addr:    s.Config.Address,
		Handler: corsObj(s.router()),
	}
	fmt.Println("🚀 Escuchando en el puerto", s.Config.Address)
	if err := srv.ListenAndServe(); err != nil {
		s.logger.Fatal(err)
	}
}

// initDB configura la conexión a la base de datos y aplica migraciones.
func (s *Server) initDB() {
	switch s.Config.Database {
	case "sqlite":
		db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
		if err != nil {
			s.logger.Fatal(err)
		}
		s.DB = db
	case "postgres":
		dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
			os.Getenv("POSTGRES_HOST"),
			os.Getenv("POSTGRES_USER"),
			os.Getenv("POSTGRES_PASSWORD"),
			os.Getenv("POSTGRES_DB"),
		)
		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {

			s.logger.Fatal(err)
		}
		s.DB = db

	}

	fmt.Println("Aplicando migraciones...")

	// Migraciones (sin borrar datos previos)
	err := s.DB.AutoMigrate(
		&models.User{},
		&models.Alchemist{},
		&models.Mission{},
		&models.Material{},
		&models.Transmutation{},
		&models.Audit{},
	)
	if err != nil {
		s.logger.Fatal(err)
	}

	if s.Config.Database == "postgres" {
		s.loadSeedData()
	}

	// Inicializar repositorios
	s.UserRepository = repository.NewUserRepository(s.DB)
	s.AlchemistRepository = repository.NewAlchemistRepository(s.DB)
	s.MissionRepository = repository.NewMissionRepository(s.DB)
	s.MaterialRepository = repository.NewMaterialRepository(s.DB)
	s.TransmutationRepository = repository.NewTransmutationRepository(s.DB)
	s.AuditRepository = repository.NewAuditRepository(s.DB)
}

func (s *Server) loadSeedData() {
	envPath := os.Getenv("INIT_SQL_PATH")
	candidates := []string{}
	if envPath != "" {
		candidates = append(candidates, envPath)
	} else {
		candidates = append(candidates, "init.sql", "../init.sql", "../../init.sql")
	}

	var (
		contents []byte
		readPath string
		err      error
	)

	for _, candidate := range candidates {
		contents, err = os.ReadFile(candidate)
		if err == nil {
			readPath = candidate
			break
		}
	}

	if readPath == "" {
		s.logger.Printf("unable to read seed file from %v: %v", candidates, err)
		return
	}

	if execErr := s.DB.Exec(string(contents)).Error; execErr != nil {
		s.logger.Printf("failed to execute seed data from %s: %v", readPath, execErr)
		return
	}

	s.logger.Printf("seed data applied from %s", readPath)
}

func (s *Server) initAsyncInfrastructure() error {
	redisAddr := s.Config.RedisAddress
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}
	s.taskQueue = NewTaskQueue(redisAddr, s.logger)
	s.taskQueue.WithRepositories(
		s.TransmutationRepository,
		s.AuditRepository,
		s.MissionRepository,
		s.MaterialRepository,
	)
	s.taskQueue.WithBroadcaster(s.eventHub)

	verificationInterval := time.Duration(s.Config.VerificationIntervalMinutes) * time.Minute
	pendingHours := time.Duration(s.Config.PendingTransmutationHours) * time.Hour
	lowStock := s.Config.MaterialLowStockThreshold

	s.taskQueue.ConfigureThresholds(verificationInterval, pendingHours, lowStock)
	if err := s.taskQueue.Start(); err != nil {
		return err
	}
	s.taskQueue.ScheduleDailyVerification()
	return nil
}

// GetJWTSecret devuelve la clave secreta usada para firmar los tokens JWT.
func (s *Server) GetJWTSecret() string {
	return s.jwtSecret
}

func (s *Server) handleEvents(w http.ResponseWriter, r *http.Request) {
	tokenString := r.URL.Query().Get("token")
	if tokenString == "" {
		s.HandleError(w, http.StatusUnauthorized, r.URL.Path, errors.New("missing token"))
		return
	}

	claims := &AuthClaims{}
	_, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(s.jwtSecret), nil
	})
	if err != nil {
		s.HandleError(w, http.StatusUnauthorized, r.URL.Path, fmt.Errorf("invalid token: %w", err))
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		s.HandleError(w, http.StatusInternalServerError, r.URL.Path, errors.New("streaming unsupported"))
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	client := s.eventHub.Subscribe()
	defer s.eventHub.Unsubscribe(client)

	welcome := welcomeMessage{
		Type: "connection",
		Payload: welcomePayload{
			Role:  claims.Role,
			Email: claims.Email,
			Name:  claims.Name,
		},
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
	if data, err := json.Marshal(welcome); err == nil {
		fmt.Fprintf(w, "data: %s\n\n", data)
		flusher.Flush()
	}

	keepAlive := time.NewTicker(30 * time.Second)
	defer keepAlive.Stop()

	for {
		select {
		case <-r.Context().Done():
			return
		case msg, ok := <-client:
			if !ok {
				return
			}
			fmt.Fprintf(w, "data: %s\n\n", msg)
			flusher.Flush()
		case <-keepAlive.C:
			fmt.Fprintf(w, ": ping\n\n")
			flusher.Flush()
		}
	}
}
