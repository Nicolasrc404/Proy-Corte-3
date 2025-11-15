package handlers

// AsyncDispatcher representa el contrato mínimo necesitan para
// enviar eventos al sistema asíncrono sin acoplarse a una implementación
// específica.
type AsyncDispatcher interface {
	EnqueueTransmutationProcessing(transmutationID uint, requestedBy string) error
	EnqueueAudit(action, entity string, entityID uint, userEmail, details string) error
}
