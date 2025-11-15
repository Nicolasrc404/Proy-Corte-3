package models

import "gorm.io/gorm"

type Transmutation struct {
	gorm.Model
	UserID     uint
	MaterialID uint
	Formula    string
	Quantity   float64
	Status     string `gorm:"default:en_proceso"`
	Result     string
}
