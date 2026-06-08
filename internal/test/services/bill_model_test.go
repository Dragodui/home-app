package services_test

import (
	"reflect"
	"strings"
	"testing"

	"github.com/Dragodui/diploma-server/internal/models"
)

func TestBillPublicHasNoGormDefault(t *testing.T) {
	field, ok := reflect.TypeOf(models.Bill{}).FieldByName("Public")
	if !ok {
		t.Fatal("Bill.Public field not found")
	}

	if strings.Contains(string(field.Tag.Get("gorm")), "default:") {
		t.Fatal("Bill.Public must not use a gorm default; it prevents false from being inserted")
	}
}
