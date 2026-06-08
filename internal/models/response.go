package models

type ErrorResponse struct {
	Status bool   `json:"status" example:"false"`
	Error  string `json:"error" example:"invalid home ID"`
}

type BillListResponse struct {
	Status bool   `json:"status" example:"true"`
	Bills  []Bill `json:"bills"`
}
