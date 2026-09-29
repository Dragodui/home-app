package home_test

import (
	"os"
	"testing"

	"github.com/Dragodui/diploma-server/internal/logger"
)

func TestMain(m *testing.M) {
	logger.Init()
	os.Exit(m.Run())
}
