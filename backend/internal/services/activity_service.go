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

// RecordActivity записывает активность пользователя в Redis
func (s *ActivityService) RecordActivity(ctx context.Context, userID uint, fileID uuid.UUID, activityType ActivityType) error {
	key := fmt.Sprintf("user:%d:file_%s", userID, activityType)
	timestamp := float64(time.Now().Unix())

	// Добавляем в Sorted Set (score = timestamp, member = file_id)
	if err := s.redis.ZAdd(ctx, key, redis.Z{
		Score:  timestamp,
		Member: fileID.String(),
	}).Err(); err != nil {
		return fmt.Errorf("failed to record activity: %w", err)
	}

	// Устанавливаем TTL на ключ
	if err := s.redis.Expire(ctx, key, ActivityTTL).Err(); err != nil {
		return fmt.Errorf("failed to set TTL: %w", err)
	}

	// Ограничиваем количество записей (храним только последние 5)
	if err := s.redis.ZRemRangeByRank(ctx, key, 0, -6).Err(); err != nil {
		return fmt.Errorf("failed to trim activity: %w", err)
	}

	return nil
}

// GetRecentActivity получает последние N файлов из активности пользователя
func (s *ActivityService) GetRecentActivity(ctx context.Context, userID uint, activityType ActivityType, limit int) ([]models.File, error) {
	key := fmt.Sprintf("user:%d:file_%s", userID, activityType)

	// Получаем последние N file_id из Sorted Set (в обратном порядке по timestamp)
	fileIDs, err := s.redis.ZRevRange(ctx, key, 0, int64(limit-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get recent activity: %w", err)
	}

	if len(fileIDs) == 0 {
		return []models.File{}, nil
	}

	// Конвертируем string в uuid.UUID
	uuids := make([]uuid.UUID, 0, len(fileIDs))
	for _, idStr := range fileIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			continue // Пропускаем невалидные UUID
		}
		uuids = append(uuids, id)
	}

	// Получаем файлы из БД
	files, err := s.fileRepo.FindByIDs(uuids, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get files: %w", err)
	}

	// Сортируем файлы в том же порядке, что и в Redis
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

// GetSuggestedFiles возвращает рекомендованные файлы на основе активности
func (s *ActivityService) GetSuggestedFiles(ctx context.Context, userID uint, limit int) ([]models.File, error) {
	// Получаем активность с весами: downloads важнее чем views
	viewKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityView)
	downloadKey := fmt.Sprintf("user:%d:file_%s", userID, ActivityDownload)

	// Получаем последние просмотры и скачивания
	views, _ := s.redis.ZRevRangeWithScores(ctx, viewKey, 0, int64(limit*2-1)).Result()
	downloads, _ := s.redis.ZRevRangeWithScores(ctx, downloadKey, 0, int64(limit*2-1)).Result()

	// Объединяем с весами (download * 2 + view * 1)
	scoreMap := make(map[string]float64)
	for _, z := range views {
		fileID := z.Member.(string)
		scoreMap[fileID] = z.Score
	}
	for _, z := range downloads {
		fileID := z.Member.(string)
		// Downloads важнее, добавляем дополнительный вес
		scoreMap[fileID] += z.Score + 1000000 // Смещаем вверх downloads
	}

	// Сортируем по score
	type scoredFile struct {
		id    string
		score float64
	}
	scored := make([]scoredFile, 0, len(scoreMap))
	for id, score := range scoreMap {
		scored = append(scored, scoredFile{id, score})
	}

	// Простая сортировка (можно использовать sort.Slice для больших данных)
	for i := 0; i < len(scored); i++ {
		for j := i + 1; j < len(scored); j++ {
			if scored[j].score > scored[i].score {
				scored[i], scored[j] = scored[j], scored[i]
			}
		}
	}

	// Берём топ N
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

	// Получаем файлы из БД
	files, err := s.fileRepo.FindByIDs(uuids, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get files: %w", err)
	}

	return files, nil
}

// GetActivityStats возвращает статистику активности пользователя (опционально)
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

// CleanOldActivity удаляет активность старше определённого периода
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
