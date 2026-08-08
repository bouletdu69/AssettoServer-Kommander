FROM golang:alpine
WORKDIR /app

RUN apk add --no-cache docker-cli docker-cli-compose

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o server cmd/server/main.go

EXPOSE 8080
CMD ["./server"]
