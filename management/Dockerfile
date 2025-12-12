FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY . .
RUN go mod tidy
RUN go build -o management .

FROM alpine:latest

WORKDIR /app
# Install docker cli to control sibling container
RUN apk add --no-cache docker-cli

COPY --from=builder /app/management .

CMD ["./management"]
