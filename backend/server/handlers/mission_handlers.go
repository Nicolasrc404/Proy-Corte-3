package handlers

import (
	"backend-avanzada/api"
	"backend-avanzada/models"
	"backend-avanzada/repository"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

type MissionHandler struct {
	Repo             *repository.MissionRepository
	Dispatcher       AsyncDispatcher
	CurrentUser      func(*http.Request) *api.AuthenticatedUser
	ReportAsyncError func(string, error)
	HandleErr        func(http.ResponseWriter, int, string, error)
	Log              func(int, string, time.Time)
}

var allowedMissionStatuses = map[string]struct{}{
	models.MissionStatusPending:    {},
	models.MissionStatusInProgress: {},
	models.MissionStatusCompleted:  {},
	models.MissionStatusArchived:   {},
}

func normalizeMissionStatus(raw string) (string, bool) {
	normalized := strings.ToUpper(strings.TrimSpace(raw))
	_, ok := allowedMissionStatuses[normalized]
	return normalized, ok
}

func NewMissionHandler(
	repo *repository.MissionRepository,
	dispatcher AsyncDispatcher,
	currentUser func(*http.Request) *api.AuthenticatedUser,
	reportAsyncError func(string, error),
	handleErr func(http.ResponseWriter, int, string, error),
	log func(int, string, time.Time),
) *MissionHandler {
	return &MissionHandler{
		Repo:             repo,
		Dispatcher:       dispatcher,
		CurrentUser:      currentUser,
		ReportAsyncError: reportAsyncError,
		HandleErr:        handleErr,
		Log:              log,
	}
}

func (h *MissionHandler) userEmail(r *http.Request) string {
	if h.CurrentUser != nil {
		if user := h.CurrentUser(r); user != nil {
			return user.Email
		}
	}
	return ""
}

func (h *MissionHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	ms, err := h.Repo.FindAll()
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}

	resp := make([]*api.MissionResponseDto, 0, len(ms))
	for _, m := range ms {
		resp = append(resp, &api.MissionResponseDto{
			ID:          int(m.ID),
			Title:       m.Title,
			Description: m.Description,
			Difficulty:  m.Difficulty,
			Status:      m.Status,
			AssignedTo:  m.AssignedTo,
			CreatedAt:   m.CreatedAt.Format(time.RFC3339),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusOK, r.URL.Path, start)
}

func (h *MissionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	m, err := h.Repo.FindById(id)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if m == nil {
		h.HandleErr(w, http.StatusNotFound, r.URL.Path, errors.New("mission not found"))
		return
	}

	resp := &api.MissionResponseDto{
		ID:          int(m.ID),
		Title:       m.Title,
		Description: m.Description,
		Difficulty:  m.Difficulty,
		Status:      m.Status,
		AssignedTo:  m.AssignedTo,
		CreatedAt:   m.CreatedAt.Format(time.RFC3339),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusOK, r.URL.Path, start)
}

func (h *MissionHandler) Create(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	var req api.MissionRequestDto
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	if req.Title == "" {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, errors.New("title required"))
		return
	}

	m := &models.Mission{
		Title:       req.Title,
		Description: req.Description,
		Difficulty:  req.Difficulty,
		Status:      models.MissionStatusPending,
		AssignedTo:  req.AssignedTo,
	}
	m, err := h.Repo.Save(m)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if h.Dispatcher != nil {
		if err := h.Dispatcher.EnqueueAudit("mission_created", "mission", m.ID, h.userEmail(r), "Mission created"); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
	}

	resp := &api.MissionResponseDto{
		ID:          int(m.ID),
		Title:       m.Title,
		Description: m.Description,
		Difficulty:  m.Difficulty,
		Status:      m.Status,
		AssignedTo:  m.AssignedTo,
		CreatedAt:   m.CreatedAt.Format(time.RFC3339),
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusCreated, r.URL.Path, start)
}

func (h *MissionHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	m, err := h.Repo.FindById(id)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if m == nil {
		h.HandleErr(w, http.StatusNotFound, r.URL.Path, errors.New("mission not found"))
		return
	}

	if err := h.Repo.Delete(m); err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if h.Dispatcher != nil {
		if err := h.Dispatcher.EnqueueAudit("mission_deleted", "mission", m.ID, h.userEmail(r), "Mission deleted"); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *MissionHandler) Edit(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	m, err := h.Repo.FindById(id)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if m == nil {
		h.HandleErr(w, http.StatusNotFound, r.URL.Path, errors.New("mission not found"))
		return
	}

	var req api.MissionEditRequestDto
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	if req.Title != nil {
		m.Title = *req.Title
	}
	if req.Description != nil {
		m.Description = *req.Description
	}
	if req.Difficulty != nil {
		m.Difficulty = *req.Difficulty
	}
	prevStatus := m.Status
	if req.Status != nil {
		m.Status = *req.Status
	}
	if req.AssignedTo != nil {
		m.AssignedTo = *req.AssignedTo
	}

	m, err = h.Repo.Save(m)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if h.Dispatcher != nil {
		action := "mission_updated"
		details := "Mission updated"
		if prevStatus != m.Status && strings.EqualFold(m.Status, models.MissionStatusCompleted) {
			action = "mission_closed"
			details = "Mission marked as completed"
		}
		if err := h.Dispatcher.EnqueueAudit(action, "mission", m.ID, h.userEmail(r), details); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
	}

	resp := &api.MissionResponseDto{
		ID:          int(m.ID),
		Title:       m.Title,
		Description: m.Description,
		Difficulty:  m.Difficulty,
		Status:      m.Status,
		AssignedTo:  m.AssignedTo,
		CreatedAt:   m.CreatedAt.Format(time.RFC3339),
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusAccepted, r.URL.Path, start)
}

func (h *MissionHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	mission, err := h.Repo.FindById(id)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if mission == nil {
		h.HandleErr(w, http.StatusNotFound, r.URL.Path, errors.New("mission not found"))
		return
	}

	var req api.MissionStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	newStatus, ok := normalizeMissionStatus(req.Status)
	if !ok {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, errors.New("invalid status value"))
		return
	}

	if mission.Status == newStatus {
		resp := &api.MissionResponseDto{
			ID:          int(mission.ID),
			Title:       mission.Title,
			Description: mission.Description,
			Difficulty:  mission.Difficulty,
			Status:      mission.Status,
			AssignedTo:  mission.AssignedTo,
			CreatedAt:   mission.CreatedAt.Format(time.RFC3339),
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
		h.Log(http.StatusOK, r.URL.Path, start)
		return
	}

	previous := mission.Status
	mission.Status = newStatus

	mission, err = h.Repo.Save(mission)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}

	if h.Dispatcher != nil {
		action := "mission_status_changed"
		details := "Mission status updated"
		if newStatus == models.MissionStatusCompleted && previous != models.MissionStatusCompleted {
			action = "mission_closed"
			details = "Mission marked as completed"
		}
		if err := h.Dispatcher.EnqueueAudit(action, "mission", mission.ID, h.userEmail(r), details); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
	}

	resp := &api.MissionResponseDto{
		ID:          int(mission.ID),
		Title:       mission.Title,
		Description: mission.Description,
		Difficulty:  mission.Difficulty,
		Status:      mission.Status,
		AssignedTo:  mission.AssignedTo,
		CreatedAt:   mission.CreatedAt.Format(time.RFC3339),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusAccepted, r.URL.Path, start)
}
