package models

import "gorm.io/gorm"

type Transmutation struct {
	gorm.Model
	UserID     uint
	MaterialID uint
	Formula    string
	Quantity   float64
	Status     string `gorm:"size:32;default:PENDING"`
	Result     string
}

const (
	TransmutationStatusPending    = "PENDING"
	TransmutationStatusProcessing = "PROCESSING"
	TransmutationStatusCompleted  = "COMPLETED"
	TransmutationStatusFailed     = "FAILED"
)
