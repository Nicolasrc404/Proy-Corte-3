package models

import "gorm.io/gorm"

type Mission struct {
	gorm.Model
	Title       string
	Description string
	Difficulty  string
	Status      string `gorm:"size:32;default:PENDING"`
	AssignedTo  uint   // Alchemist ID
}

const (
	MissionStatusPending    = "PENDING"
	MissionStatusInProgress = "IN_PROGRESS"
	MissionStatusCompleted  = "COMPLETED"
	MissionStatusArchived   = "ARCHIVED"
)
