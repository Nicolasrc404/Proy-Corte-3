package repository

import (
	"backend-avanzada/models"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrMaterialNotFound     = errors.New("material not found")
	ErrInsufficientMaterial = errors.New("insufficient material quantity")
)

type TransmutationRepository struct {
	db *gorm.DB
}

func (r *TransmutationRepository) FindPendingBefore(threshold time.Time) ([]*models.Transmutation, error) {
	var ts []*models.Transmutation
	err := r.db.Where("status = ? AND created_at < ?", "en_proceso", threshold).Find(&ts).Error
	return ts, err
}

func (r *TransmutationRepository) FindById(id int) (*models.Transmutation, error) {
	var t models.Transmutation
	err := r.db.First(&t, id).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	return &t, err
}

func (r *TransmutationRepository) Delete(t *models.Transmutation) error {
	return r.db.Delete(t).Error
}

func NewTransmutationRepository(db *gorm.DB) *TransmutationRepository {
	return &TransmutationRepository{db: db}
}

func (r *TransmutationRepository) FindAll() ([]*models.Transmutation, error) {
	var ts []*models.Transmutation
	err := r.db.Find(&ts).Error
	return ts, err
}

func (r *TransmutationRepository) Create(t *models.Transmutation) (*models.Transmutation, error) {
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var material models.Material
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&material, t.MaterialID).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrMaterialNotFound
			}
			return err
		}
		if material.Quantity < t.Quantity {
			return ErrInsufficientMaterial
		}
		material.Quantity -= t.Quantity
		if err := tx.Save(&material).Error; err != nil {
			return err
		}
		if err := tx.Create(t).Error; err != nil {
			return err
		}
		return nil
	})
	if errors.Is(err, ErrMaterialNotFound) || errors.Is(err, ErrInsufficientMaterial) {
		return nil, err
	}
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TransmutationRepository) Save(t *models.Transmutation) (*models.Transmutation, error) {
	if err := r.db.Save(t).Error; err != nil {
		return nil, err
	}
	return t, nil
}
