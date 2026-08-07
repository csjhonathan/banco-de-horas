DC      = docker compose
DC_DEV  = docker compose -f docker-compose.yml -f docker-compose.dev.yml

.PHONY: help dev up down build logs logs-dev restart ps clean atlas

help: ## Lista os comandos
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

dev: ## Sobe em modo dev com hot reload (node --watch)
	$(DC_DEV) up --build

up: ## Sobe em modo producao (app + mongo local), em background
	$(DC) up --build -d

atlas: ## Sobe SO o app (use quando MONGO_URI apontar pro Atlas)
	$(DC) up --build -d app

down: ## Derruba os containers
	$(DC) down

build: ## Rebuild da imagem
	$(DC) build

logs: ## Logs do app
	$(DC) logs -f app

logs-dev: ## Logs no modo dev
	$(DC_DEV) logs -f app

restart: ## Reinicia o app
	$(DC) restart app

ps: ## Status dos containers
	$(DC) ps

clean: ## Derruba tudo e apaga o volume do Mongo (APAGA OS DADOS)
	$(DC) down -v
