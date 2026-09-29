package user

import (
	"context"
	"errors"
	"fmt"
	"regexp"

	"github.com/Dragodui/diploma-server/internal/event"
	"github.com/Dragodui/diploma-server/internal/models"
	"github.com/redis/go-redis/v9"
)

var UsernameRegex = regexp.MustCompile(`^[a-z][a-z0-9_]{2,31}$`)

type Service struct {
	repo  Repository
	cache *redis.Client
}

type IService interface {
	GetUserByID(ctx context.Context, userID int) (*models.User, error)
	UpdateUser(ctx context.Context, userID int, name string) error
	UpdateUsername(ctx context.Context, userID int, username string) error
	UpdateUserAvatar(ctx context.Context, userID int, imagePath string) error
	UpdateProfilePublic(ctx context.Context, userID int, profilePublic bool) error
}

func NewService(repo Repository, redis *redis.Client) *Service {
	return &Service{repo: repo, cache: redis}
}

func (s *Service) GetUserByID(ctx context.Context, userID int) (*models.User, error) {
	user, err := s.repo.FindByID(ctx, userID)

	if err != nil {
		return nil, err
	}

	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, err
}

func (s *Service) UpdateUser(ctx context.Context, userID int, name string) error {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	updates := map[string]interface{}{}
	updates["name"] = name

	if err := s.repo.Update(ctx, user, updates); err != nil {
		return err
	}

	event.SendEvent(ctx, s.cache, fmt.Sprintf("user:%d:updates", userID), &event.RealTimeEvent{
		Module: event.ModuleUser,
		Action: event.ActionUpdated,
		Data:   user,
	})

	return nil
}

func (s *Service) UpdateUsername(ctx context.Context, userID int, username string) error {
	if !UsernameRegex.MatchString(username) {
		return errors.New("username must be 3-32 characters, start with a letter, and contain only lowercase letters, numbers, and underscores")
	}

	existing, err := s.repo.FindByUsername(ctx, username)
	if err != nil {
		return err
	}
	if existing != nil && existing.ID != userID {
		return errors.New("username is already taken")
	}

	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	updates := map[string]interface{}{"username": username}
	if err := s.repo.Update(ctx, user, updates); err != nil {
		return err
	}

	event.SendEvent(ctx, s.cache, fmt.Sprintf("user:%d:updates", userID), &event.RealTimeEvent{
		Module: event.ModuleUser,
		Action: event.ActionUpdated,
		Data:   user,
	})

	return nil
}

func (s *Service) UpdateUserAvatar(ctx context.Context, userID int, imagePath string) error {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	updates := map[string]interface{}{}
	updates["avatar"] = imagePath

	if err := s.repo.Update(ctx, user, updates); err != nil {
		return err
	}

	event.SendEvent(ctx, s.cache, fmt.Sprintf("user:%d:updates", userID), &event.RealTimeEvent{
		Module: event.ModuleUser,
		Action: event.ActionUpdated,
		Data:   user,
	})

	return nil
}

func (s *Service) UpdateProfilePublic(ctx context.Context, userID int, profilePublic bool) error {
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return errors.New("user not found")
	}

	updates := map[string]interface{}{"profile_public": profilePublic}
	if err := s.repo.Update(ctx, user, updates); err != nil {
		return err
	}

	event.SendEvent(ctx, s.cache, fmt.Sprintf("user:%d:updates", userID), &event.RealTimeEvent{
		Module: event.ModuleUser,
		Action: event.ActionUpdated,
		Data:   user,
	})

	return nil
}
