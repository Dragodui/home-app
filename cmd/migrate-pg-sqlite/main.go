// Command migrate-pg-sqlite copies all application data from a Postgres
// database into a new SQLite file.
//
//	SOURCE_DSN='postgresql://...?sslmode=require' go run ./cmd/migrate-pg-sqlite -out ./data/home.db
//
// The target file must not exist yet or must have empty tables. The schema is
// created with the same AutoMigrate the server runs. Rows are copied as raw
// column maps, not through the model structs, so false/zero values are kept
// as-is instead of being replaced by column defaults (e.g. default:true).
package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/Dragodui/diploma-server/internal/database"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"gorm.io/gorm/schema"
)

const batchSize = 200

func main() {
	out := flag.String("out", "./data/home.db", "path of the SQLite file to create")
	flag.Parse()

	srcDSN := os.Getenv("SOURCE_DSN")
	if srcDSN == "" {
		log.Fatal("SOURCE_DSN is required (Postgres connection string)")
	}

	gcfg := &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)}

	// Open the target first: it sets time.Local to UTC, so timestamps read
	// from Postgres are written to SQLite with a single, comparable offset.
	dst, err := database.Open(database.DriverSQLite, *out, gcfg)
	if err != nil {
		log.Fatalf("open sqlite: %v", err)
	}
	src, err := database.Open(database.DriverPostgres, srcDSN, gcfg)
	if err != nil {
		log.Fatalf("open postgres: %v", err)
	}

	if err := database.AutoMigrate(dst); err != nil {
		log.Fatalf("create sqlite schema: %v", err)
	}

	// Pin one connection so the PRAGMA applies to every statement below.
	dstSQL, err := dst.DB()
	if err != nil {
		log.Fatal(err)
	}
	dstSQL.SetMaxOpenConns(1)
	if err := dst.Exec("PRAGMA foreign_keys = OFF").Error; err != nil {
		log.Fatal(err)
	}

	tables := make([]*schema.Schema, 0)
	for _, m := range database.Models() {
		stmt := &gorm.Statement{DB: dst}
		if err := stmt.Parse(m); err != nil {
			log.Fatalf("parse model %T: %v", m, err)
		}
		tables = append(tables, stmt.Schema)

		var n int64
		if err := dst.Table(stmt.Schema.Table).Count(&n).Error; err != nil {
			log.Fatal(err)
		}
		if n > 0 {
			log.Fatalf("target table %s already has %d rows; use a new -out file", stmt.Schema.Table, n)
		}
	}

	err = dst.Transaction(func(tx *gorm.DB) error {
		for _, s := range tables {
			if err := copyTable(src, tx, s); err != nil {
				return fmt.Errorf("%s: %w", s.Table, err)
			}
		}
		return nil
	})
	if err != nil {
		log.Fatalf("copy failed, nothing written: %v", err)
	}

	var violations []map[string]any
	if err := dst.Raw("PRAGMA foreign_key_check").Scan(&violations).Error; err != nil {
		log.Fatal(err)
	}
	if len(violations) > 0 {
		log.Printf("WARNING: %d foreign key violations (orphan rows from source):", len(violations))
		for _, v := range violations {
			log.Printf("  %v", v)
		}
	}

	fmt.Println("\ntable                     postgres    sqlite")
	ok := true
	for _, s := range tables {
		var a, b int64
		src.Table(s.Table).Count(&a)
		dst.Table(s.Table).Count(&b)
		mark := ""
		if a != b {
			mark, ok = "  MISMATCH", false
		}
		fmt.Printf("%-24s %9d %9d%s\n", s.Table, a, b, mark)
	}
	if !ok {
		log.Fatal("row counts differ")
	}
	fmt.Printf("\ndone: %s\n", *out)
}

func copyTable(src, dst *gorm.DB, s *schema.Schema) error {
	// Only columns the current models know about, quoted because some are
	// reserved words (bills.end).
	cols := make([]string, len(s.DBNames))
	for i, c := range s.DBNames {
		cols[i] = src.Statement.Quote(c)
	}
	sel := strings.Join(cols, ", ")
	order := "1"
	if s.PrioritizedPrimaryField != nil {
		order = s.PrioritizedPrimaryField.DBName
	}

	for offset := 0; ; offset += batchSize {
		var rows []map[string]any
		err := src.Table(s.Table).Select(sel).Order(order).
			Limit(batchSize).Offset(offset).Find(&rows).Error
		if err != nil {
			return err
		}
		if len(rows) == 0 {
			return nil
		}
		for _, r := range rows {
			for k, v := range r {
				if b, ok := v.([]byte); ok { // jsonb arrives as bytes
					r[k] = string(b)
				}
			}
		}
		if err := dst.Table(s.Table).Create(&rows).Error; err != nil {
			return err
		}
		if len(rows) < batchSize {
			return nil
		}
	}
}
