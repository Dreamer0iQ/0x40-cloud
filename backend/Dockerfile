# Multi-stage build для уменьшения размера

# Stage 1: Build
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Устанавливаем необходимые зависимости
RUN apk add --no-cache git

# Копируем go.mod и go.sum для кеширования зависимостей
COPY go.mod go.sum ./

RUN go mod download

# Копируем весь код
COPY . .

# Собираем приложение
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags '-w -s' -o server ./cmd/server

# Stage 2: Runtime
FROM alpine:3.21

RUN apk --no-cache add ca-certificates tzdata wget su-exec

WORKDIR /app

# Создаем непривилегированного пользователя
RUN adduser -D -u 1000 appuser

# Копируем бинарник из builder
COPY --from=builder /app/server .

# Копируем entrypoint скрипт
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Создаём директорию для хранилища
RUN mkdir -p /app/storage && chown -R appuser:appuser /app

# Контейнер стартует как root, entrypoint переключит на appuser
# Expose порт
EXPOSE 8080

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Запускаем через entrypoint
ENTRYPOINT ["./entrypoint.sh"]
