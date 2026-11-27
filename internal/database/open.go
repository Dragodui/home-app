package database

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

const (
	DriverPostgres = "postgres"
	DriverSQLite   = "sqlite"
)

// Open connects to the database selected by driver ("postgres" or "sqlite").
// For sqlite, dsn is a file path such as "./data/home.db".
func Open(driver, dsn string, cfg *gorm.Config) (*gorm.DB, error) {
	switch driver {
	case "", DriverPostgres:
		return gorm.Open(postgres.Open(dsn), cfg)
	case DriverSQLite:
		return openSQLite(dsn, cfg)
	default:
		return nil, fmt.Errorf("unknown DB_DRIVER %q (want postgres or sqlite)", driver)
	}
}

func openSQLite(path string, cfg *gorm.Config) (*gorm.DB, error) {
	// SQLite stores timestamps as text and compares them as strings, so every
	// timestamp must be written with the same UTC offset for range queries
	// (due dates, token expiry, scheduler runs) to stay correct.
	time.Local = time.UTC

	path = strings.TrimPrefix(path, "file:")
	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("create sqlite dir: %w", err)
		}
	}

	dsn := "file:" + path +
		"?_pragma=foreign_keys(1)" +
		"&_pragma=journal_mode(WAL)" +
		"&_pragma=busy_timeout(5000)" +
		"&_pragma=synchronous(NORMAL)" +
		"&_txlock=immediate"

	return gorm.Open(sqlite.Open(dsn), cfg)
}
