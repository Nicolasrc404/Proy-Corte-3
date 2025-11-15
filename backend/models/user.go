package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Name         string `gorm:"size:255;not null" json:"name"`
	Specialty    string `gorm:"size:255;not null" json:"specialty"`
	Email        string `gorm:"uniqueIndex;size:255;not null" json:"email"`
	PasswordHash string `gorm:"size:255;not null" json:"-"`
	Role         string `gorm:"size:32;not null" json:"role"` // "alchemist" | "supervisor"
}
