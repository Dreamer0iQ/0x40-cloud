package services

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/bhop_dynasty/0x40_cloud/internal/models"
	"github.com/bhop_dynasty/0x40_cloud/internal/repositories"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type ActivityType string

const (
	ActivityView     ActivityType = "view"
	ActivityDownload ActivityType = "download"
)

const (
	// TTL для активности пользователя - 90 дней
	ActivityTTL = 90 * 24 * time.Hour
)

type ActivityService struct {
	redis    *redis.Client
	fileRepo *repositories.FileRepository
}

func NewActivityService(redis *redis.Client, fileRepo *repositories.FileRepository) *ActivityService {
	return &ActivityService{
		redis:    redis,
		fileRepo: fileRepo,
	}
}

func (s *ActivityService) RecordActivity(ctx context.Context, userID uint, fileID uuid.UUID, activityType ActivityType) error {
	key := fmt.Sprintf("user:%d:file_%s", userID, activityType)
	timestamp := float64(time.Now().Unix())

	if err := s.redis.ZAdd(ctx, key, redis.Z{
		Score:  timestamp,
		Member: fileID.String(),
	}).Err(); err != nil {
		return fmt.Errorf("failed to record activity: %w", err)
	}

	if err := s.redis.Expire(ctx, key, ActivityTTL).Err(); err != nil {
		return fmt.Errorf("failed to set TTL: %w", err)
	}

	if err := s.redis.ZRemRangeByRank(ctx, key, 0, -6).Err(); err != nil {
		return fmt.Errorf("failed to trim activity: %w", err)
	}

	return nil
}

func (s *ActivityService) GetRecentActivity(ctx context.Context, userID uint, activityType ActivityType, limit int) ([]models.File, error) {
	key := fmt.Sprintf("user:%d:file_%s", userID, activityType)

	fileIDs, err := s.redis.ZRevRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get recent activity: %w", err)
	}

	if len(fileIDs) == 0 {
		return []models.File{}, nil
	}

	uuids := make([]uuid.UUID, 0, len(fileIDs))
	for _, idStr := range fileIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			continue // Пропускаем невалидные UUID
		}
		uuids = append(uuids, id)
	}

	files, err := s.fileRepo.FindByIDs(uuids, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get files: %w", err)
	}

	fileMap := make(map[uuid.UUID]*models.File)
	for i := range files {
		fileMap[files[i].ID] = &files[i]
	}

	sortedFiles := make([]models.File, 0, len(uuids))
	for _, id := range uuids {
		if file, ok := fileMap[id]; ok {
			sortedFiles = append(sortedFiles, *file)
		}
	}

	return sortedFiles, nil
}

func (s *ActivityService) GetSuggestedFiles(ctx context.Context, userID uint, limit int) ([]models.File, error) {
	viewKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityView)
	downloadKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityDownload)

	views, _ := s.redis.ZRevRangeWithScores(ctx, viewKey, 0, int64(limit*2-1)).Result()
	downloads, _ := s.redis.ZRevRangeWithScores(ctx, downloadKey, 0, int64(limit*2-1)).Result()

	scoreMap := make(map[string]float64)
	for _, z := range views {
		fileID := z.Member.(string)
		scoreMap[fileID] = z.Score
	}
	for _, z := range downloads {
		fileID := z.Member.(string)
		scoreMap[fileID] += z.Score + 1000000 // Смещаем вверх downloads
	}

	type scoredFile struct {
		id    string
		score float64
	}
	scored := make([]scoredFile, 0, len(scoreMap))
	for id, score := range scoreMap {
		scored = append(scored, scoredFile{id, score})
	}

	for i := 0; i < len(scored); i++ {
		for j := i + 1; j < len(scored); j++ {
			if scored[j].score > scored[i].score {
				scored[i], scored[j] = scored[j], scored[i]
			}
		}
	}

	topN := limit
	if len(scored) < topN {
		topN = len(scored)
	}

	uuids := make([]uuid.UUID, 0, topN)
	for i := 0; i < topN; i++ {
		id, err := uuid.Parse(scored[i].id)
		if err != nil {
			continue
		}
		uuids = append(uuids, id)
	}

	if len(uuids) == 0 {
		return []models.File{}, nil
	}

	files, err := s.fileRepo.FindByIDs(uuids, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get files: %w", err)
	}

	return files, nil
}

func (s *ActivityService) GetActivityStats(ctx context.Context, userID uint) (map[string]int64, error) {
	stats := make(map[string]int64)

	viewKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityView)
	downloadKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityDownload)

	viewCount, err := s.redis.ZCard(ctx, viewKey).Result()
	if err != nil {
		return nil, err
	}

	downloadCount, err := s.redis.ZCard(ctx, downloadKey).Result()
	if err != nil {
		return nil, err
	}

	stats["views"] = viewCount
	stats["downloads"] = downloadCount

	return stats, nil
}

func (s *ActivityService) CleanOldActivity(ctx context.Context, userID uint, olderThan time.Duration) error {
	timestamp := float64(time.Now().Add(-olderThan).Unix())

	viewKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityView)
	downloadKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityDownload)

	if err := s.redis.ZRemRangeByScore(ctx, viewKey, "0", strconv.FormatFloat(timestamp, 'f', 0, 64)).Err(); err != nil {
		return err
	}

	if err := s.redis.ZRemRangeByScore(ctx, downloadKey, "0", strconv.FormatFloat(timestamp, 'f', 0, 64)).Err(); err != nil {
		return err
	}

	return nil
}
