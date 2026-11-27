package models

import "gorm.io/gorm"

// FileURLResolver converts between what is stored in the database for a private file
// and the link a client can open.
//
// Private files are stored as a stable reference (for s7a: "s7a://<bucket>/<key>")
// because their links expire. Every time a model is loaded, the reference is turned
// into a fresh temporary link; every time it is saved, a link that the client sent
// back is turned into the reference again. Public links and external URLs pass
// through both methods unchanged.
type FileURLResolver interface {
	// Resolve turns a stored value into a link a client can open.
	Resolve(stored string) string
	// Normalize turns a link received from a client into the value to store.
	Normalize(link string) string
}

type identityResolver struct{}

func (identityResolver) Resolve(s string) string   { return s }
func (identityResolver) Normalize(s string) string { return s }

var fileURLs FileURLResolver = identityResolver{}

// SetFileURLResolver installs the resolver used by model hooks. Call once at startup.
func SetFileURLResolver(r FileURLResolver) {
	if r == nil {
		r = identityResolver{}
	}
	fileURLs = r
}

// NormalizeFileURL is for code paths that bypass model hooks, e.g. Updates(map).
func NormalizeFileURL(link string) string {
	return fileURLs.Normalize(link)
}

func resolveFile(p *string) {
	if p != nil && *p != "" {
		*p = fileURLs.Resolve(*p)
	}
}

func normalizeFile(p *string) {
	if p != nil && *p != "" {
		*p = fileURLs.Normalize(*p)
	}
}

// Hooks: normalize before writing, resolve after reading and after writing
// (so the struct returned to the client after create/update holds an openable link).

func (b *Bill) BeforeSave(*gorm.DB) error { normalizeFile(b.ReceiptImage); return nil }
func (b *Bill) AfterSave(*gorm.DB) error  { resolveFile(b.ReceiptImage); return nil }
func (b *Bill) AfterFind(*gorm.DB) error  { resolveFile(b.ReceiptImage); return nil }

func (s *BillSchedule) BeforeSave(*gorm.DB) error { normalizeFile(s.ReceiptImage); return nil }
func (s *BillSchedule) AfterSave(*gorm.DB) error  { resolveFile(s.ReceiptImage); return nil }
func (s *BillSchedule) AfterFind(*gorm.DB) error  { resolveFile(s.ReceiptImage); return nil }

func (m *ChatMessage) BeforeSave(*gorm.DB) error { normalizeFile(m.ImageURL); return nil }
func (m *ChatMessage) AfterSave(*gorm.DB) error  { resolveFile(m.ImageURL); return nil }
func (m *ChatMessage) AfterFind(*gorm.DB) error  { resolveFile(m.ImageURL); return nil }

func (i *ShoppingItem) BeforeSave(*gorm.DB) error { normalizeFile(i.Image); return nil }
func (i *ShoppingItem) AfterSave(*gorm.DB) error  { resolveFile(i.Image); return nil }
func (i *ShoppingItem) AfterFind(*gorm.DB) error  { resolveFile(i.Image); return nil }
