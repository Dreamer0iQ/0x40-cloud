FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with optimizations
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o management .

FROM alpine:latest

WORKDIR /app
# Install docker cli to control sibling container
RUN apk add --no-cache docker-cli docker-cli-compose

COPY --from=builder /app/management .

CMD ["./management"]
