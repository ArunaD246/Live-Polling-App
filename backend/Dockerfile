# Build stage
FROM golang:alpine AS builder

WORKDIR /app

# Install git (needed for some go dependencies)
RUN apk add --no-cache git ca-certificates

# Download dependencies first (cached layer)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o server .

# Run stage - minimal image
FROM alpine:latest
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/server .
COPY --from=builder /app/dist ./dist

EXPOSE 8080
ENV PORT=8080
ENV GIN_MODE=release

CMD ["./server"]
