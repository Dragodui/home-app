package room

import (
	"context"
	"errors"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/logger"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/Dragodui/diploma-server/internal/utils"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	repo  Repository
	cache *redis.Client
}

type IService interface {
	CreateRoom(ctx context.Context, name string, icon *string, color string, homeID, createdBy int) error
	GetRoomByID(ctx context.Context, roomID int) (*models.Room, error)
	GetRoomsByHomeID(ctx context.Context, homeID int) (*[]models.Room, error)
	UpdateRoom(ctx context.Context, roomID int, name, icon, color *string) error
	DeleteRoom(ctx context.Context, roomID int) error
}

func NewService(repo Repository, cache *redis.Client) *Service {
	return &Service{repo: repo, cache: cache}
}

func (s *Service) CreateRoom(ctx context.Context, name string, icon *string, color string, homeID, createdBy int) error {
	// delete homes rooms from cache
	key := utils.GetRoomsForHomeKey(homeID)
	if err := utils.DeleteFromCache(ctx, key, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", key, err)
	}

	if color == "" {
		color = "#FBEB9E"
	}

	room := &models.Room{
		Name:      name,
		Icon:      icon,
		Color:     color,
		HomeID:    homeID,
		CreatedBy: createdBy,
	}
	if err := s.repo.Create(ctx, room); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleRoom,
		Action: event.ActionCreated,
		Data:   room,
	})

	return nil
}

func (s *Service) GetRoomByID(ctx context.Context, roomID int) (*models.Room, error) {
	key := utils.GetRoomKey(roomID)

	// try to get from cache
	cached, err := utils.GetFromCache[models.Room](ctx, key, s.cache)
	if cached != nil && err == nil {
		return cached, nil
	}

	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, errors.New("room not found")
	}

	if err := utils.WriteToCache(ctx, key, room, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	return room, nil
}

func (s *Service) GetRoomsByHomeID(ctx context.Context, homeID int) (*[]models.Room, error) {
	key := utils.GetRoomsForHomeKey(homeID)
	cached, err := utils.GetFromCache[[]models.Room](ctx, key, s.cache)
	if cached != nil && err == nil {
		return cached, nil
	}

	rooms, err := s.repo.FindByHomeID(ctx, homeID)
	if err != nil {
		return nil, err
	}

	if err := utils.WriteToCache(ctx, key, rooms, s.cache); err != nil {
		logger.Info.Printf("Failed to write to cache [%s]: %v", key, err)
	}

	return rooms, nil
}

func (s *Service) DeleteRoom(ctx context.Context, roomID int) error {
	// delete from cache
	roomKey := utils.GetRoomKey(roomID)
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room == nil {
		return errors.New("room not found")
	}
	homeID := room.HomeID
	roomsKey := utils.GetRoomsForHomeKey(homeID)
	if err := utils.DeleteFromCache(ctx, roomKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", roomKey, err)
	}
	if err := utils.DeleteFromCache(ctx, roomsKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", roomsKey, err)
	}

	if err := s.repo.Delete(ctx, roomID); err != nil {
		return err
	}

	event.SendHomeEvent(ctx, s.cache, homeID, &event.RealTimeEvent{
		Module: event.ModuleRoom,
		Action: event.ActionDeleted,
		Data:   room,
	})

	return nil
}

func (s *Service) UpdateRoom(ctx context.Context, roomID int, name, icon, color *string) error {
	room, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return err
	}
	if room == nil {
		return errors.New("room not found")
	}

	if name != nil {
		room.Name = *name
	}
	if icon != nil {
		room.Icon = icon
	}
	if color != nil {
		room.Color = *color
	}

	if err := s.repo.Update(ctx, room); err != nil {
		return err
	}

	roomKey := utils.GetRoomKey(roomID)
	roomsKey := utils.GetRoomsForHomeKey(room.HomeID)
	if err := utils.DeleteFromCache(ctx, roomKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", roomKey, err)
	}
	if err := utils.DeleteFromCache(ctx, roomsKey, s.cache); err != nil {
		logger.Info.Printf("Failed to delete redis cache for key %s: %v", roomsKey, err)
	}

	event.SendHomeEvent(ctx, s.cache, room.HomeID, &event.RealTimeEvent{
		Module: event.ModuleRoom,
		Action: event.ActionUpdated,
		Data:   room,
	})

	return nil
}
