.PHONY: help dev build start mongo mongo-down clean

help: ## Lista os comandos
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Sobe o Next em modo dev (hot reload)
	npm run dev

build: ## Build de produção
	npm run build

start: ## Sobe o build de produção
	npm run start

mongo: ## Sobe só o MongoDB local (docker) em background
	docker compose up -d mongo

mongo-down: ## Derruba o MongoDB local
	docker compose down

clean: ## Derruba e APAGA o volume do Mongo local
	docker compose down -v
