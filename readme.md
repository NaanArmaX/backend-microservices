
# Backend Microservices

Este repositório contém um conjunto de microservices para um projeto de backend, com serviços de **Autenticação (Auth)** e outros serviços relacionados, como **Payments** e **Resource**. A API principal lida com registro, login, e autenticação usando JWT, PostgreSQL e Redis.




## Documentação da API - Auth

#### Registra User

```http
  POST /register
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `username` | `string` | **Obrigatório**. Usuario |
| `password` | `string` | **Obrigatório**. Senha |

{
    "username": "string",
    "password": "string"
  }

#### Login User

```http
  POST /login
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `username` | `string` | **Obrigatório**. Usuario |
| `password` | `string` | **Obrigatório**. Senha |

#### Logout

```http
  POST /logout
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `Token` | `string` | **Obrigatório**. JWT de login |


## Documentação da API - Pay

#### Lista clientes

```http
  GET /stripe/clients
```

#### Logout

```http
  POST /stripe/clients
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `email` | `string` | Email do cliente |
| `name` | `string` | nome do cliente |


## Documentação da API - Products

###  Listar produtos

```http
  GET /products
```
###  Adicionar produtos

```http
  POST /products
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `name` | `string` | nome do produto |
| `price` | `int` | valro do produto |

###  Atualizar produtos

```http
  PUT products/{id}
```

| Parâmetro   | Tipo       | Descrição                           |
| :---------- | :--------- | :---------------------------------- |
| `name` | `string` | nome do produto |
| `price` | `int` | valro do produto |

###  Apagar produto

```http
  PUT products/{id}
```


## Deploy

Para fazer o deploy desse projeto rode

```bash
  git clone https://github.com/seu-usuario/backend-microservices.git
  cd backend-microservices
```

#### Cria o .env

```bash
    DATABASE_URL=postgres://postgres:postgres@db:5432/auth_db
    REDIS_URL=redis://redis:6379
    JWT_SECRET=seu-jwt-secret
```

#### Roda os Containers

```bash
   docker-compose up --build
```

## Diagrama da Arquitetura

Abaixo está o diagrama representando a arquitetura atual do sistema, incluindo os principais serviços e suas interações.

```mermaid
graph LR
  subgraph Auth Service
    A1[Auth Service] -->|Login| DB[(PostgreSQL)]
    A1 -->|JWT| JWT[(JWT)]
    A1 -->|Redis| REDIS[(Redis)]
  end
  
  subgraph Payments Service
    P1[Payments Service] -->|Consulta| DB[(PostgreSQL)]
    P1 -->|Realiza Pagamento| PAY[(Payment Gateway)]
  end
  
  subgraph Resource Service
    R1[Resource Service] -->|Consulta| DB[(PostgreSQL)]
    R1 -->|Chama API| A1
  end

  DB[(PostgreSQL)] -->|Compartilhado| REDIS[(Redis)]
  A1 -->|Faz Requisição| P1
  P1 -->|Retorna Dados| R1
  R1 -->|Consulta| DB
  PAY -->|Retorno Pagamento| P1
  P1 -->|Resposta ao Usuário| A1
  ```