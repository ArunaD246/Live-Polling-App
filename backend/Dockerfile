# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Dependencies
COPY go.mod go.sum ./
RUN go mod download

# Source
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Run stage
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates

COPY --from=builder /app/server .

EXPOSE 8080
ENV PORT=8080

CMD ["./server"]
