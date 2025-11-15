package api

type TransmutationRequestDto struct {
	UserID     uint    `json:"user_id"`
	MaterialID uint    `json:"material_id"`
	Formula    string  `json:"formula"`
	Quantity   float64 `json:"quantity"`
}

type TransmutationResponseDto struct {
	ID         int     `json:"id"`
	UserID     uint    `json:"user_id"`
	MaterialID uint    `json:"material_id"`
	Quantity   float64 `json:"quantity"`
	Status     string  `json:"status"`
	Result     string  `json:"result"`
	CreatedAt  string  `json:"created_at"`
}

type TransmutationEditRequestDto struct {
	Formula *string `json:"formula,omitempty"`
	Status  *string `json:"status,omitempty"`
	Result  *string `json:"result,omitempty"`
}
