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

type TransmutationHandler struct {
	Repo             *repository.TransmutationRepository
	Dispatcher       AsyncDispatcher
	CurrentUser      func(*http.Request) *api.AuthenticatedUser
	ReportAsyncError func(string, error)
	Broadcast        func(string, interface{})
	Log              func(status int, path string, start time.Time)
	HandleErr        func(w http.ResponseWriter, statusCode int, path string, cause error)
}

func NewTransmutationHandler(
	repo *repository.TransmutationRepository,
	dispatcher AsyncDispatcher,
	currentUser func(*http.Request) *api.AuthenticatedUser,
	reportAsyncError func(string, error),
	broadcast func(string, interface{}),
	handleErr func(http.ResponseWriter, int, string, error),
	log func(int, string, time.Time),
) *TransmutationHandler {
	return &TransmutationHandler{
		Repo:             repo,
		Dispatcher:       dispatcher,
		CurrentUser:      currentUser,
		ReportAsyncError: reportAsyncError,
		Broadcast:        broadcast,
		HandleErr:        handleErr,
		Log:              log,
	}
}

func (h *TransmutationHandler) currentUser(r *http.Request) *api.AuthenticatedUser {
	if h.CurrentUser != nil {
		return h.CurrentUser(r)
	}
	return nil
}

func (h *TransmutationHandler) emitTransmutationEvent(t *models.Transmutation) {
	if h.Broadcast == nil {
		return
	}
	payload := &api.TransmutationResponseDto{
		ID:         int(t.ID),
		UserID:     t.UserID,
		MaterialID: t.MaterialID,
		Formula:    t.Formula,
		Quantity:   t.Quantity,
		Status:     t.Status,
		Result:     t.Result,
		CreatedAt:  t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  t.UpdatedAt.Format(time.RFC3339),
	}
	h.Broadcast("transmutation.updated", payload)
}

func (h *TransmutationHandler) Create(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	var req api.TransmutationRequestDto
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}
	user := h.currentUser(r)
	if user == nil {
		h.HandleErr(w, http.StatusUnauthorized, r.URL.Path, errors.New("unauthorized"))
		return
	}

	ownerID := user.ID
	if user.Role == "supervisor" && req.UserID != 0 {
		ownerID = req.UserID
	}
	if ownerID == 0 {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, errors.New("invalid user"))
		return
	}
	if req.MaterialID == 0 {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, errors.New("material is required"))
		return
	}
	if req.Quantity <= 0 {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, errors.New("quantity must be greater than zero"))
		return
	}

	t := &models.Transmutation{
		UserID:     ownerID,
		MaterialID: req.MaterialID,
		Formula:    req.Formula,
		Quantity:   req.Quantity,
		Status:     models.TransmutationStatusPending,
	}
	t, err := h.Repo.Create(t)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrMaterialNotFound):
			h.HandleErr(w, http.StatusBadRequest, r.URL.Path, errors.New("material not found"))
		case errors.Is(err, repository.ErrInsufficientMaterial):
			h.HandleErr(w, http.StatusBadRequest, r.URL.Path, errors.New("insufficient material quantity"))
		default:
			h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		}
		return
	}

	if h.Dispatcher != nil {
		if err := h.Dispatcher.EnqueueTransmutationProcessing(t.ID, user.Email); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
		details := "transmutation queued for processing"
		if strings.TrimSpace(t.Formula) != "" {
			details = "formula: " + t.Formula
		}
		if err := h.Dispatcher.EnqueueAudit("transmutation_created", "transmutation", t.ID, user.Email, details); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
	}

	resp := &api.TransmutationResponseDto{
		ID:         int(t.ID),
		UserID:     t.UserID,
		MaterialID: t.MaterialID,
		Formula:    t.Formula,
		Quantity:   t.Quantity,
		Status:     t.Status,
		Result:     t.Result,
		CreatedAt:  t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  t.UpdatedAt.Format(time.RFC3339),
	}
	h.emitTransmutationEvent(t)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusCreated, r.URL.Path, start)
}

func (h *TransmutationHandler) GetAll(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	user := h.currentUser(r)
	if user == nil {
		h.HandleErr(w, http.StatusUnauthorized, r.URL.Path, errors.New("unauthorized"))
		return
	}

	var (
		transmutations []*models.Transmutation
		err            error
	)

	if user.Role == "supervisor" {
		transmutations, err = h.Repo.FindAll()
	} else {
		transmutations, err = h.Repo.FindAllByUser(user.ID)
	}
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	resp := []*api.TransmutationResponseDto{}
	for _, t := range transmutations {
		resp = append(resp, &api.TransmutationResponseDto{
			ID:         int(t.ID),
			UserID:     t.UserID,
			MaterialID: t.MaterialID,
			Formula:    t.Formula,
			Quantity:   t.Quantity,
			Status:     t.Status,
			Result:     t.Result,
			CreatedAt:  t.CreatedAt.Format(time.RFC3339),
			UpdatedAt:  t.UpdatedAt.Format(time.RFC3339),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusOK, r.URL.Path, start)
}

func (h *TransmutationHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}
	user := h.currentUser(r)
	if user == nil {
		h.HandleErr(w, http.StatusUnauthorized, r.URL.Path, errors.New("unauthorized"))
		return
	}
	t, err := h.Repo.FindById(id)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if t == nil {
		h.HandleErr(w, http.StatusNotFound, r.URL.Path, errors.New("transmutation not found"))
		return
	}
	if user.Role != "supervisor" && t.UserID != user.ID {
		h.HandleErr(w, http.StatusForbidden, r.URL.Path, errors.New("forbidden"))
		return
	}
	resp := &api.TransmutationResponseDto{
		ID:         int(t.ID),
		UserID:     t.UserID,
		MaterialID: t.MaterialID,
		Formula:    t.Formula,
		Quantity:   t.Quantity,
		Status:     t.Status,
		Result:     t.Result,
		CreatedAt:  t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  t.UpdatedAt.Format(time.RFC3339),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusOK, r.URL.Path, start)
}

func (h *TransmutationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	t, err := h.Repo.FindById(id)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if t == nil {
		h.HandleErr(w, http.StatusNotFound, r.URL.Path, errors.New("transmutation not found"))
		return
	}

	if err := h.Repo.Delete(t); err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if h.Dispatcher != nil {
		user := h.currentUser(r)
		email := ""
		if user != nil {
			email = user.Email
		}
		if err := h.Dispatcher.EnqueueAudit("transmutation_deleted", "transmutation", t.ID, email, "transmutation removed"); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
	}

	if h.Broadcast != nil {
		h.Broadcast("transmutation.deleted", map[string]interface{}{"id": t.ID})
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *TransmutationHandler) Edit(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id, err := strconv.Atoi(mux.Vars(r)["id"])
	if err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	t, err := h.Repo.FindById(id)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if t == nil {
		h.HandleErr(w, http.StatusNotFound, r.URL.Path, errors.New("transmutation not found"))
		return
	}

	var req api.TransmutationEditRequestDto
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.HandleErr(w, http.StatusBadRequest, r.URL.Path, err)
		return
	}

	if req.Formula != nil {
		t.Formula = *req.Formula
	}
	if req.Status != nil {
		t.Status = *req.Status
	}
	if req.Result != nil {
		t.Result = *req.Result
	}

	t, err = h.Repo.Save(t)
	if err != nil {
		h.HandleErr(w, http.StatusInternalServerError, r.URL.Path, err)
		return
	}
	if h.Dispatcher != nil {
		user := h.currentUser(r)
		email := ""
		if user != nil {
			email = user.Email
		}
		if err := h.Dispatcher.EnqueueAudit("transmutation_updated", "transmutation", t.ID, email, "manual update"); err != nil {
			h.ReportAsyncError(r.URL.Path, err)
		}
	}

	resp := &api.TransmutationResponseDto{
		ID:         int(t.ID),
		UserID:     t.UserID,
		MaterialID: t.MaterialID,
		Formula:    t.Formula,
		Quantity:   t.Quantity,
		Status:     t.Status,
		Result:     t.Result,
		CreatedAt:  t.CreatedAt.Format(time.RFC3339),
		UpdatedAt:  t.UpdatedAt.Format(time.RFC3339),
	}
	h.emitTransmutationEvent(t)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": resp})
	h.Log(http.StatusAccepted, r.URL.Path, start)
}
