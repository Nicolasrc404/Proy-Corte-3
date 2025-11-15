package server

import (
	"backend-avanzada/server/handlers"
	"net/http"

	"github.com/gorilla/mux"
)

func (s *Server) router() http.Handler {
	router := mux.NewRouter()
	router.Use(s.logger.RequestLogger)

	router.HandleFunc("/events", s.handleEvents).Methods(http.MethodGet)

	dispatcher := s.taskQueue
	asyncReporter := s.asyncErrorReporter()
	currentUser := currentUserExtractor

	// * AUTH
	authHandler := handlers.NewAuthHandler(
		s.GetJWTSecret(),
		s.UserRepository,
		s.AlchemistRepository,
		dispatcher,
		s.HandleError,
		s.logger.Info,
	)
	router.HandleFunc("/auth/register", authHandler.Register).Methods(http.MethodPost)
	router.HandleFunc("/auth/login", authHandler.Login).Methods(http.MethodPost)

	// * ALCHEMISTS
	if s.AlchemistRepository != nil {
		alchHandler := handlers.NewAlchemistHandler(
			s.AlchemistRepository,
			dispatcher,
			currentUser,
			asyncReporter,
			s.HandleError,
			s.logger.Info,
		)
		// Lectura pública
		router.Handle(
			"/alchemists",
			s.AuthMiddleware("supervisor")(http.HandlerFunc(alchHandler.GetAll)),
		).Methods(http.MethodGet)
		router.Handle(
			"/alchemists/{id}",
			s.AuthMiddleware("supervisor")(http.HandlerFunc(alchHandler.GetByID)),
		).Methods(http.MethodGet)

		// Mutaciones protegidas
		router.Handle(
			"/alchemists",
			s.AuthMiddleware("supervisor")(http.HandlerFunc(alchHandler.Create)),
		).Methods(http.MethodPost)
		router.Handle(
			"/alchemists/{id}",
			s.AuthMiddleware("supervisor")(http.HandlerFunc(alchHandler.Edit)),
		).Methods(http.MethodPut)
		router.Handle(
			"/alchemists/{id}",
			s.AuthMiddleware("supervisor")(http.HandlerFunc(alchHandler.Delete)),
		).Methods(http.MethodDelete)

		// * MISSIONS
		if s.MissionRepository != nil {
			mh := handlers.NewMissionHandler(
				s.MissionRepository,
				dispatcher,
				currentUser,
				asyncReporter,
				s.HandleError,
				s.logger.Info,
			)
			router.Handle(
				"/missions",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(mh.GetAll)),
			).Methods(http.MethodGet)
			router.Handle(
				"/missions/{id}",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(mh.GetByID)),
			).Methods(http.MethodGet)
			router.Handle("/missions",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(mh.Create)),
			).Methods(http.MethodPost)
			router.Handle("/missions/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(mh.Edit)),
			).Methods(http.MethodPut)
			router.Handle("/missions/{id}/status",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(mh.UpdateStatus)),
			).Methods(http.MethodPatch)
			router.Handle("/missions/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(mh.Delete)),
			).Methods(http.MethodDelete)
		}

		// * TRANSMUTATIONS
		if s.TransmutationRepository != nil {
			transHandler := handlers.NewTransmutationHandler(
				s.TransmutationRepository,
				dispatcher,
				currentUser,
				asyncReporter,
				s.eventHub.Broadcast,
				s.HandleError,
				s.logger.Info,
			)

			router.Handle(
				"/transmutations",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(transHandler.GetAll)),
			).Methods(http.MethodGet)
			router.Handle(
				"/transmutations/{id}",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(transHandler.GetByID)),
			).Methods(http.MethodGet)

			router.Handle(
				"/transmutations",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(transHandler.Create)),
			).Methods(http.MethodPost)

			router.Handle(
				"/transmutations/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(transHandler.Edit)),
			).Methods(http.MethodPut)

			router.Handle(
				"/transmutations/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(transHandler.Delete)),
			).Methods(http.MethodDelete)
		}

		// * MATERIALS
		if s.MaterialRepository != nil {
			matHandler := handlers.NewMaterialHandler(
				s.MaterialRepository,
				dispatcher,
				currentUser,
				asyncReporter,
				s.HandleError,
				s.logger.Info,
			)
			router.Handle(
				"/materials",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(matHandler.GetAll)),
			).Methods(http.MethodGet)
			router.Handle(
				"/materials/{id}",
				s.AuthMiddleware("alchemist", "supervisor")(http.HandlerFunc(matHandler.GetByID)),
			).Methods(http.MethodGet)
			router.Handle("/materials",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(matHandler.Create)),
			).Methods(http.MethodPost)
			router.Handle("/materials/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(matHandler.Edit)),
			).Methods(http.MethodPut)
			router.Handle("/materials/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(matHandler.Delete)),
			).Methods(http.MethodDelete)
		}

		// * AUDITS
		if s.AuditRepository != nil {
			auditHandler := handlers.NewAuditHandler(
				s.AuditRepository,
				s.eventHub.Broadcast,
				s.HandleError,
				s.logger.Info,
			)
			router.Handle(
				"/audits",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(auditHandler.GetAll)),
			).Methods(http.MethodGet)
			router.Handle(
				"/audits/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(auditHandler.GetByID)),
			).Methods(http.MethodGet)
			router.Handle("/audits",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(auditHandler.Create)),
			).Methods(http.MethodPost)
			router.Handle("/audits/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(auditHandler.Edit)),
			).Methods(http.MethodPut)
			router.Handle("/audits/{id}",
				s.AuthMiddleware("supervisor")(http.HandlerFunc(auditHandler.Delete)),
			).Methods(http.MethodDelete)
		}

	}

	return router
}
