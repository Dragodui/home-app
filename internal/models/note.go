package models

import "time"

type Note struct {
	ID             int           `gorm:"autoIncrement; primaryKey" json:"id"`
	HomeID         int           `gorm:"not null" json:"home_id"`
	NoteCategoryID *int          `json:"note_category_id"`
	CreatedBy      int           `json:"created_by"`
	Title          string        `gorm:"not null;size:256" json:"title"`
	Content        string        `gorm:"not null" json:"content"`
	CreatedAt      time.Time     `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt      time.Time     `gorm:"autoUpdateTime" json:"updated_at"`

	// relations
	Home         *Home         `gorm:"foreignKey:HomeID;constraint:OnDelete:CASCADE" json:"home,omitempty"`
	Creator      *User         `gorm:"foreignKey:CreatedBy;constraint:OnDelete:CASCADE" json:"creator,omitempty"`
	NoteCategory *NoteCategory `gorm:"foreignKey:NoteCategoryID;constraint:OnDelete:SET NULL" json:"note_category,omitempty"`

	// Mentions relations
	MentionedUsers             []User             `gorm:"many2many:note_user_mentions;constraint:OnDelete:CASCADE" json:"mentioned_users,omitempty"`
	MentionedTasks             []Task             `gorm:"many2many:note_task_mentions;constraint:OnDelete:CASCADE" json:"mentioned_tasks,omitempty"`
	MentionedBills             []Bill             `gorm:"many2many:note_bill_mentions;constraint:OnDelete:CASCADE" json:"mentioned_bills,omitempty"`
	MentionedShoppingItems     []ShoppingItem     `gorm:"many2many:note_shopping_item_mentions;constraint:OnDelete:CASCADE" json:"mentioned_shopping_items,omitempty"`
	MentionedNoteCategories     []NoteCategory     `gorm:"many2many:note_note_category_mentions;constraint:OnDelete:CASCADE" json:"mentioned_note_categories,omitempty"`
	MentionedBillCategories     []BillCategory     `gorm:"many2many:note_bill_category_mentions;constraint:OnDelete:CASCADE" json:"mentioned_bill_categories,omitempty"`
	MentionedShoppingCategories []ShoppingCategory `gorm:"many2many:note_shopping_category_mentions;constraint:OnDelete:CASCADE" json:"mentioned_shopping_categories,omitempty"`
}

type CreateNoteRequest struct {
	NoteCategoryID               *int   `json:"note_category_id"`
	Title                        string `json:"title" validate:"required,min=1,max=256"`
	Content                      string `json:"content"`
	MentionedUserIDs             []int  `json:"mentioned_user_ids"`
	MentionedTaskIDs             []int  `json:"mentioned_task_ids"`
	MentionedBillIDs             []int  `json:"mentioned_bill_ids"`
	MentionedShoppingItemIDs     []int  `json:"mentioned_shopping_item_ids"`
	MentionedNoteCategoryIDs     []int  `json:"mentioned_note_category_ids"`
	MentionedBillCategoryIDs     []int  `json:"mentioned_bill_category_ids"`
	MentionedShoppingCategoryIDs []int  `json:"mentioned_shopping_category_ids"`
}

type UpdateNoteRequest struct {
	NoteCategoryID               *int    `json:"note_category_id"`
	Title                        *string `json:"title" validate:"omitempty,min=1,max=256"`
	Content                      *string `json:"content"`
	MentionedUserIDs             *[]int  `json:"mentioned_user_ids"`
	MentionedTaskIDs             *[]int  `json:"mentioned_task_ids"`
	MentionedBillIDs             *[]int  `json:"mentioned_bill_ids"`
	MentionedShoppingItemIDs     *[]int  `json:"mentioned_shopping_item_ids"`
	MentionedNoteCategoryIDs     *[]int  `json:"mentioned_note_category_ids"`
	MentionedBillCategoryIDs     *[]int  `json:"mentioned_bill_category_ids"`
	MentionedShoppingCategoryIDs *[]int  `json:"mentioned_shopping_category_ids"`
}