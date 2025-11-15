package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"backend-avanzada/api"
	"backend-avanzada/logger"
	"backend-avanzada/models"
	"backend-avanzada/repository"
)

const (
	taskTypeProcessTransmutation = "process_transmutation"
	taskTypeRegisterAudit        = "register_audit"
	taskTypeDailyVerification    = "daily_verification"
)

type queueTask struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type processTransmutationPayload struct {
	TransmutationID uint   `json:"transmutation_id"`
	RequestedBy     string `json:"requested_by"`
}

type registerAuditPayload struct {
	Action    string `json:"action"`
	Entity    string `json:"entity"`
	EntityID  uint   `json:"entity_id"`
	UserEmail string `json:"user_email"`
	Details   string `json:"details"`
}

type dailyVerificationPayload struct {
	ExecutedAt time.Time `json:"executed_at"`
}

type EventBroadcaster interface {
	Broadcast(eventType string, payload interface{})
}

// TaskQueue coordina todo el trabajo en segundo plano de la aplicación.
type TaskQueue struct {
	redis              *RedisClient
	logger             *logger.Logger
	ctx                context.Context
	cancel             context.CancelFunc
	transRepo          *repository.TransmutationRepository
	auditRepo          *repository.AuditRepository
	missionRepo        *repository.MissionRepository
	materialRepo       *repository.MaterialRepository
	broadcaster        EventBroadcaster
	verificationTicker *time.Ticker
	verificationEvery  time.Duration
	pendingThreshold   time.Duration
	lowStockThreshold  float64
	started            bool
}

func NewTaskQueue(redisAddr string, log *logger.Logger) *TaskQueue {
	ctx, cancel := context.WithCancel(context.Background())
	return &TaskQueue{
		redis:             NewRedisClient(redisAddr),
		logger:            log,
		ctx:               ctx,
		cancel:            cancel,
		started:           false,
		lowStockThreshold: 5,
		verificationEvery: 24 * time.Hour,
		pendingThreshold:  24 * time.Hour,
	}
}

func (q *TaskQueue) WithRepositories(
	transRepo *repository.TransmutationRepository,
	auditRepo *repository.AuditRepository,
	missionRepo *repository.MissionRepository,
	materialRepo *repository.MaterialRepository,
) {
	q.transRepo = transRepo
	q.auditRepo = auditRepo
	q.missionRepo = missionRepo
	q.materialRepo = materialRepo
}

func (q *TaskQueue) WithBroadcaster(b EventBroadcaster) {
	q.broadcaster = b
}

func (q *TaskQueue) ConfigureThresholds(verificationEvery, pendingThreshold time.Duration, lowStockThreshold float64) {
	if verificationEvery > 0 {
		q.verificationEvery = verificationEvery
	}
	if pendingThreshold > 0 {
		q.pendingThreshold = pendingThreshold
	}
	if lowStockThreshold > 0 {
		q.lowStockThreshold = lowStockThreshold
	}
}

func (q *TaskQueue) broadcast(eventType string, payload interface{}) {
	if q.broadcaster != nil {
		q.broadcaster.Broadcast(eventType, payload)
	}
}

// Start arranca el worker que consume trabajos desde Redis.
func (q *TaskQueue) Start() error {
	if q.started {
		return nil
	}
	if err := q.redis.Ping(q.ctx); err != nil {
		return fmt.Errorf("async queue is not available: %w", err)
	}
	q.started = true
	go q.worker()
	return nil
}

// Stop detiene de forma ordenada el worker y el ticker.
func (q *TaskQueue) Stop() {
	q.cancel()
	if q.verificationTicker != nil {
		q.verificationTicker.Stop()
	}
}

// ScheduleDailyVerification programa trabajos de verificación en el intervalo configurado.
func (q *TaskQueue) ScheduleDailyVerification() {
	if !q.started {
		return
	}
	q.logger.Printf("[async] programando verificaciones cada %s", q.verificationEvery)
	q.verificationTicker = time.NewTicker(q.verificationEvery)
	go func() {
		// Ejecutar una verificación inmediata al arrancar.
		if err := q.enqueueDailyVerification(); err != nil {
			q.logger.Printf("[async] no se pudo encolar verificación inicial: %v", err)
		}
		for {
			select {
			case <-q.ctx.Done():
				return
			case <-q.verificationTicker.C:
				if err := q.enqueueDailyVerification(); err != nil {
					q.logger.Printf("[async] error encolando verificación diaria: %v", err)
				}
			}
		}
	}()
}

// EnqueueTransmutationProcessing programa el procesamiento pesado de una transmutación.
func (q *TaskQueue) EnqueueTransmutationProcessing(transmutationID uint, requestedBy string) error {
	payload := processTransmutationPayload{TransmutationID: transmutationID, RequestedBy: requestedBy}
	return q.enqueue(taskTypeProcessTransmutation, payload)
}

// EnqueueAudit registra una auditoría de forma asíncrona para que los handlers no se bloqueen en escrituras a la base de datos.
func (q *TaskQueue) EnqueueAudit(action, entity string, entityID uint, userEmail, details string) error {
	payload := registerAuditPayload{
		Action:    action,
		Entity:    entity,
		EntityID:  entityID,
		UserEmail: userEmail,
		Details:   details,
	}
	return q.enqueue(taskTypeRegisterAudit, payload)
}

func (q *TaskQueue) enqueueDailyVerification() error {
	payload := dailyVerificationPayload{ExecutedAt: time.Now().UTC()}
	return q.enqueue(taskTypeDailyVerification, payload)
}

func (q *TaskQueue) enqueue(taskType string, payload interface{}) error {
	if !q.started {
		return errors.New("async queue has not been started")
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	task := queueTask{Type: taskType, Payload: data}
	raw, err := json.Marshal(task)
	if err != nil {
		return err
	}
	return q.redis.LPUSH(q.ctx, redisQueueKey, raw)
}

func (q *TaskQueue) worker() {
	for {
		select {
		case <-q.ctx.Done():
			return
		default:
		}
		data, err := q.redis.BRPOP(q.ctx, redisQueueKey)
		if err != nil {
			if errors.Is(err, context.Canceled) {
				return
			}
			q.logger.Printf("[async] error leyendo cola: %v", err)
			time.Sleep(2 * time.Second)
			continue
		}
		var task queueTask
		if err := json.Unmarshal(data, &task); err != nil {
			q.logger.Printf("[async] payload inválido: %v", err)
			continue
		}
		if err := q.dispatch(task); err != nil {
			q.logger.Printf("[async] error ejecutando tarea %s: %v", task.Type, err)
			q.recordWorkerError(task.Type, err)
		}
	}
}

func (q *TaskQueue) dispatch(task queueTask) error {
	switch task.Type {
	case taskTypeProcessTransmutation:
		var payload processTransmutationPayload
		if err := json.Unmarshal(task.Payload, &payload); err != nil {
			return err
		}
		return q.handleTransmutation(payload)
	case taskTypeRegisterAudit:
		var payload registerAuditPayload
		if err := json.Unmarshal(task.Payload, &payload); err != nil {
			return err
		}
		return q.handleAudit(payload)
	case taskTypeDailyVerification:
		return q.handleDailyVerification()
	default:
		return fmt.Errorf("tipo de tarea desconocido: %s", task.Type)
	}
}

func (q *TaskQueue) handleTransmutation(payload processTransmutationPayload) error {
	if q.transRepo == nil {
		return errors.New("transmutation repository is not configured")
	}
	transmutation, err := q.transRepo.FindById(int(payload.TransmutationID))
	if err != nil {
		return err
	}
	if transmutation == nil {
		return fmt.Errorf("transmutación %d no encontrada", payload.TransmutationID)
	}
	if strings.EqualFold(transmutation.Status, models.TransmutationStatusCompleted) {
		return nil
	}

	startedAt := time.Now().UTC()
	transmutation.Status = models.TransmutationStatusProcessing
	transmutation.Result = fmt.Sprintf("Processing started at %s", startedAt.Format(time.RFC3339))
	if _, err := q.transRepo.Save(transmutation); err != nil {
		return err
	}
	q.broadcast("transmutation.updated", transmutationToResponse(transmutation))

	// Simula un trabajo costoso.
	time.Sleep(3 * time.Second)

	transmutation.Status = models.TransmutationStatusCompleted
	transmutation.Result = fmt.Sprintf("Completed at %s", time.Now().UTC().Format(time.RFC3339))
	if _, err := q.transRepo.Save(transmutation); err != nil {
		transmutation.Status = models.TransmutationStatusFailed
		transmutation.Result = fmt.Sprintf("Failed to persist completion: %v", err)
		if _, saveErr := q.transRepo.Save(transmutation); saveErr != nil {
			q.logger.Printf("[async] error marcando transmutación %d como fallida: %v", transmutation.ID, saveErr)
		}
		q.broadcast("transmutation.updated", transmutationToResponse(transmutation))
		return err
	}

	q.broadcast("transmutation.updated", transmutationToResponse(transmutation))

	if q.auditRepo != nil {
		audit := registerAuditPayload{
			Action:    "transmutation_processed",
			Entity:    "transmutation",
			EntityID:  transmutation.ID,
			UserEmail: payload.RequestedBy,
			Details:   transmutation.Result,
		}
		if err := q.handleAudit(audit); err != nil {
			return err
		}
	}
	return nil
}

func (q *TaskQueue) handleAudit(payload registerAuditPayload) error {
	if q.auditRepo == nil {
		return errors.New("audit repository is not configured")
	}
	audit := &models.Audit{
		Action:    payload.Action,
		Entity:    payload.Entity,
		EntityID:  payload.EntityID,
		UserEmail: payload.UserEmail,
		Details:   payload.Details,
	}
	saved, err := q.auditRepo.Save(audit)
	if err != nil {
		return err
	}
	q.broadcast("audit.created", auditToResponse(saved))
	return nil
}

func (q *TaskQueue) handleDailyVerification() error {
	if q.auditRepo == nil {
		return errors.New("audit repository is not configured")
	}
	var details []string

	if q.transRepo != nil {
		threshold := time.Now().Add(-q.pendingThreshold)
		pending, err := q.transRepo.FindPendingBefore(threshold)
		if err != nil {
			return err
		}
		if len(pending) > 0 {
			details = append(details, fmt.Sprintf("%d transmutaciones pendientes", len(pending)))
		}
	}

	if q.missionRepo != nil {
		threshold := time.Now().Add(-q.pendingThreshold)
		open, err := q.missionRepo.FindOpenBefore(threshold)
		if err != nil {
			return err
		}
		if len(open) > 0 {
			details = append(details, fmt.Sprintf("%d misiones sin cerrar", len(open)))
		}
	}

	if q.materialRepo != nil {
		scarce, err := q.materialRepo.FindScarce(q.lowStockThreshold)
		if err != nil {
			return err
		}
		if len(scarce) > 0 {
			details = append(details, fmt.Sprintf("%d materiales con stock crítico", len(scarce)))
		}
	}

	if len(details) == 0 {
		details = append(details, "Sin hallazgos críticos")
	}

	audit := &models.Audit{
		Action:    "daily_verification",
		Entity:    "system",
		Details:   strings.Join(details, "; "),
		UserEmail: "system",
	}
	saved, err := q.auditRepo.Save(audit)
	if err != nil {
		return err
	}
	q.broadcast("audit.created", auditToResponse(saved))
	return nil
}

func transmutationToResponse(t *models.Transmutation) *api.TransmutationResponseDto {
	if t == nil {
		return nil
	}
	return &api.TransmutationResponseDto{
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
}

func auditToResponse(a *models.Audit) *api.AuditResponseDto {
	if a == nil {
		return nil
	}
	return &api.AuditResponseDto{
		ID:        int(a.ID),
		Action:    a.Action,
		Entity:    a.Entity,
		EntityID:  a.EntityID,
		UserEmail: a.UserEmail,
		Details:   a.Details,
		CreatedAt: a.CreatedAt.Format(time.RFC3339),
	}
}

func (q *TaskQueue) recordWorkerError(taskType string, cause error) {
	if cause == nil || q.auditRepo == nil {
		return
	}
	audit := &models.Audit{
		Action:    "worker_error",
		Entity:    taskType,
		Details:   cause.Error(),
		UserEmail: "system",
	}
	saved, err := q.auditRepo.Save(audit)
	if err != nil {
		q.logger.Printf("[async] no se pudo registrar auditoría de error: %v", err)
		return
	}
	q.broadcast("audit.created", auditToResponse(saved))
}

// asyncErrorReporter crea un ayudante que los controladores pueden utilizar para informar de problemas asíncronos.
func (s *Server) asyncErrorReporter() func(path string, err error) {
	return func(path string, err error) {
		if err == nil {
			return
		}
		s.logger.Error(http.StatusInternalServerError, fmt.Sprintf("%s [async]", path), err)
		if s.taskQueue != nil {
			if enqueueErr := s.taskQueue.EnqueueAudit("async_error", "system", 0, "system", fmt.Sprintf("%s: %v", path, err)); enqueueErr != nil {
				s.logger.Error(http.StatusInternalServerError, fmt.Sprintf("%s [async-audit]", path), enqueueErr)
			}
		}
	}
}
