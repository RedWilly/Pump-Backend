# Multi-Chain PUMP API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Base URL](#base-url)
5. [Endpoints](#endpoints)
   - [Tokens](#tokens)
   - [Transactions](#transactions)
   - [Liquidity](#liquidity)
   - [Price](#price)
6. [WebSocket](#websocket)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Changelog](#changelog)

## Introduction

Welcome to the Multi-Chain DEX API documentation. This API provides access to token information, transaction data, liquidity events, and price data across multiple blockchain networks. It's designed to support mine decentralized exchanges  operating on various chains.

## Getting Started

To use this backend api, you'll need to:
1. Have a basic understanding of RESTful APIs and JSON.
2. Be familiar with blockchain concepts, especially related to DEXs, monitor events etc...
3. Have an HTTP client (like cURL, Postman, or your preferred programming language's HTTP library).

## Authentication

Currently, this backend api does not require authentication. However, rate limiting may be applied to prevent abuse.

## Base URL

All API requests should be made to:

```
http://localhost:9007
```

Replace `localhost:9007` with the actual domain where your API is hosted.

## Endpoints

### Tokens

#### Get All Tokens

Retrieves a list of all tokens on a specific chain.

- **URL:** `/api/tokens/:chain/all`
- **Method:** `GET`
- **URL Params:** 
  - `chain` (required): The blockchain network (e.g., "shibarium")
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/all?page=1&pageSize=10
```

**Example Response:**
```json
{
  "tokens": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "chain": "shibarium",
      "address": "0x1234567890123456789012345678901234567890",
      "creatorAddress": "0x9876543210987654321098765432109876543210",
      "name": "Example Token",
      "symbol": "EXT",
      "logo": "https://example.com/logo.png",
      "description": "This is an example token",
      "createdAt": "2024-07-21T08:00:00Z",
      "updatedAt": "2024-07-21T08:00:00Z"
    },
    // ... more tokens
  ],
  "totalCount": 100,
  "currentPage": 1,
  "totalPages": 10
}
```

#### Get Token by ID

Retrieves detailed information about a specific token, including recent transactions.

- **URL:** `/api/tokens/:chain/token/:id`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `id` (required): The unique identifier of the token
- **Query Params:**
  - `transactionPage` (optional): Page number for transaction pagination (default: 1)
  - `transactionPageSize` (optional): Number of transactions per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/token/123e4567-e89b-12d3-a456-426614174000
```

**Example Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "chain": "shibarium",
  "address": "0x1234567890123456789012345678901234567890",
  "creatorAddress": "0x9876543210987654321098765432109876543210",
  "name": "Example Token",
  "symbol": "EXT",
  "logo": "https://example.com/logo.png",
  "description": "This is an example token",
  "createdAt": "2024-07-21T08:00:00Z",
  "updatedAt": "2024-07-21T08:00:00Z",
  "latestLiquidityEvent": {
    "id": "987e6543-e21b-12d3-a456-426614174000",
    "ethAmount": "1000000000000000000",
    "tokenAmount": "1000000000",
    "timestamp": "2024-07-21T09:00:00Z"
  },
  "transactions": {
    "data": [
      {
        "id": "456e7890-e12b-12d3-a456-426614174000",
        "type": "buy",
        "senderAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
        "recipientAddress": "0x1234567890123456789012345678901234567890",
        "ethAmount": "500000000000000000",
        "tokenAmount": "5000000",
        "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "timestamp": "2024-07-21T08:30:00Z",
        "tokenPrice": "100000000000000"
      },
      // ... more transactions
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 20,
      "totalCount": 50,
      "totalPages": 3
    }
  }
}
```

#### Get Recent Tokens

Retrieves a list of recently created tokens on a specific chain.

- **URL:** `/api/tokens/:chain/recent`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)
  - `hours` (optional): Number of hours to look back (default: 1)

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/recent?page=1&pageSize=10&hours=24
```

**Example Response:**
```json
{
  "tokens": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "chain": "shibarium",
      "address": "0x1234567890123456789012345678901234567890",
      "creatorAddress": "0x9876543210987654321098765432109876543210",
      "name": "New Example Token",
      "symbol": "NET",
      "logo": "https://example.com/newlogo.png",
      "description": "This is a newly created token",
      "createdAt": "2024-07-21T07:30:00Z",
      "updatedAt": "2024-07-21T07:30:00Z"
    },
    // ... more tokens
  ],
  "totalCount": 30,
  "currentPage": 1,
  "totalPages": 3
}
```

#### Get Token by Address

Retrieves information about a token using its contract address.

- **URL:** `/api/tokens/:chain/address/:address`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `address` (required): The contract address of the token

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/address/0x1234567890123456789012345678901234567890
```

**Example Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "chain": "shibarium",
  "address": "0x1234567890123456789012345678901234567890",
  "creatorAddress": "0x9876543210987654321098765432109876543210",
  "name": "Example Token",
  "symbol": "EXT",
  "logo": "https://example.com/logo.png",
  "description": "This is an example token",
  "createdAt": "2024-07-21T08:00:00Z",
  "updatedAt": "2024-07-21T08:00:00Z"
}
```

#### Get Tokens with Liquidity

Retrieves a list of tokens that have liquidity events, along with their latest liquidity event.

- **URL:** `/api/tokens/:chain/with-liquidity`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/with-liquidity?page=1&pageSize=10
```

**Example Response:**
```json
{
  "tokens": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "address": "0x1234567890123456789012345678901234567890",
      "creatorAddress": "0x9876543210987654321098765432109876543210",
      "name": "Example Token",
      "symbol": "EXT",
      "logo": "https://example.com/logo.png",
      "description": "This is an example token",
      "createdAt": "2024-07-21T08:00:00Z",
      "updatedAt": "2024-07-21T08:00:00Z",
      "latestLiquidityEvent": {
        "id": "987e6543-e21b-12d3-a456-426614174000",
        "ethAmount": "1000000000000000000",
        "tokenAmount": "1000000000",
        "timestamp": "2024-07-21T09:00:00Z"
      }
    },
    // ... more tokens
  ],
  "pagination": {
    "totalCount": 50,
    "page": 1,
    "pageSize": 10,
    "totalPages": 5
  }
}
```

#### Get Token Info and Transactions by Address

Retrieves detailed information about a token and its recent transactions using the token's contract address.

- **URL:** `/api/tokens/:chain/info-and-transactions/:address`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `address` (required): The contract address of the token
- **Query Params:**
  - `transactionPage` (optional): Page number for transaction pagination (default: 1)
  - `transactionPageSize` (optional): Number of transactions per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/info-and-transactions/0x1234567890123456789012345678901234567890?transactionPage=1&transactionPageSize=10
```

**Example Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "chain": "shibarium",
  "address": "0x1234567890123456789012345678901234567890",
  "creatorAddress": "0x9876543210987654321098765432109876543210",
  "name": "Example Token",
  "symbol": "EXT",
  "logo": "https://example.com/logo.png",
  "description": "This is an example token",
  "createdAt": "2024-07-21T08:00:00Z",
  "updatedAt": "2024-07-21T08:00:00Z",
  "transactions": {
    "data": [
      {
        "id": "456e7890-e12b-12d3-a456-426614174000",
        "type": "buy",
        "senderAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
        "recipientAddress": "0x1234567890123456789012345678901234567890",
        "ethAmount": "500000000000000000",
        "tokenAmount": "5000000",
        "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        "timestamp": "2024-07-21T08:30:00Z",
        "tokenPrice": "100000000000000"
      },
      // ... more transactions
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 50,
      "totalPages": 5
    }
  }
}
```

#### Get Token Historical Prices

Retrieves the historical price data for a specific token.

- **URL:** `/api/tokens/:chain/historical-prices/:address`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `address` (required): The contract address of the token

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/historical-prices/0x1234567890123456789012345678901234567890
```

**Example Response:**
```json
[
  {
    "tokenPrice": "100000000000000",
    "timestamp": "2024-07-21T08:00:00Z"
  },
  {
    "tokenPrice": "102000000000000",
    "timestamp": "2024-07-21T09:00:00Z"
  },
  // ... more price data points
]
```

#### Update Token Info

Updates the additional information of a token.

- **URL:** `/api/tokens/:chain/update/:address`
- **Method:** `PATCH`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `address` (required): The contract address of the token
- **Body:**
  ```json
  {
    "logo": "https://example.com/newlogo.png",
    "description": "Updated token description",
    "website": "https://example.com",
    "telegram": "https://t.me/exampletoken",
    "discord": "https://discord.gg/exampletoken",
    "twitter": "https://twitter.com/exampletoken",
    "youtube": "https://youtube.com/exampletoken"
  }
  ```

**Example Request:**
```
PATCH http://localhost:9007/api/tokens/shibarium/update/0x1234567890123456789012345678901234567890
```

**Example Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "chain": "shibarium",
  "address": "0x1234567890123456789012345678901234567890",
  "creatorAddress": "0x9876543210987654321098765432109876543210",
  "name": "Example Token",
  "symbol": "EXT",
  "logo": "https://example.com/newlogo.png",
  "description": "Updated token description",
  "createdAt": "2024-07-21T08:00:00Z",
  "updatedAt": "2024-07-21T10:00:00Z",
  "website": "https://example.com",
  "telegram": "https://t.me/exampletoken",
  "discord": "https://discord.gg/exampletoken",
  "twitter": "https://twitter.com/exampletoken",
  "youtube": "https://youtube.com/exampletoken"
}
```

#### Get All Token Addresses

Retrieves a list of all token addresses and their symbols on a specific chain.

- **URL:** `/api/tokens/:chain/addresses`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/addresses
```

**Example Response:**
```json
[
  {
    "address": "0x1234567890123456789012345678901234567890",
    "symbol": "EXT"
  },
  {
    "address": "0x0987654321098765432109876543210987654321",
    "symbol": "ANT"
  },
  // ... more tokens
]
```

#### Get Token Statistics

Retrieves various statistics for a specific token.

- **URL:** `/api/tokens/:chain/statistics/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `timeframe` (optional): The timeframe for statistics (options: 'day', 'week', 'month', default: 'day')

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/statistics/123e4567-e89b-12d3-a456-426614174000?timeframe=week
```

**Example Response:**
```json
{
  "volume": "1000000000000000000000",
  "transactionCount": 150,
  "liquidityAdded": {
    "ethAmount": "50000000000000000000",
    "tokenAmount": "500000000"
  },
  "latestPrice": "200000000000000"
}
```

#### Get Top Tokens

Retrieves a list of top tokens based on liquidity.

- **URL:** `/api/tokens/:chain/top`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
- **Query Params:**
  - `limit` (optional): Number of top tokens to retrieve (default: 10)

**Example Request:**
```
GET http://localhost:9007/api/tokens/shibarium/top?limit=5
```

**Example Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Example Token",
    "symbol": "EXT",
    "address": "0x1234567890123456789012345678901234567890",
    "totalLiquidity": "1000000000000000000000"
  },
  // ... more tokens
]
```

### Transactions

#### Get Transactions by Token ID

Retrieves a list of transactions for a specific token.

- **URL:** `/api/transactions/:chain/token/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/token/123e4567-e89b-12d3-a456-426614174000?page=1&pageSize=10
```

**Example Response:**
```json
{
  "transactions": [
    {
      "id": "456e7890-e12b-12d3-a456-426614174000",
      "type": "buy",
      "senderAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
      "recipientAddress": "0x1234567890123456789012345678901234567890",
      "ethAmount": "500000000000000000",
      "tokenAmount": "5000000",
      "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "timestamp": "2024-07-21T08:30:00Z",
      "tokenPrice": "100000000000000"
    },
    // ... more transactions
  ],
  "totalCount": 50,
  "currentPage": 1,
  "totalPages": 5
}
```

#### Get Transactions by Address

Retrieves a list of transactions for a specific address (sender or recipient).

- **URL:** `/api/transactions/:chain/address/:address`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `address` (required): The address to fetch transactions for
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/address/0xabcdef1234567890abcdef1234567890abcdef12?page=1&pageSize=10
```

**Example Response:**
```json
{
  "transactions": [
    {
      "id": "456e7890-e12b-12d3-a456-426614174000",
      "type": "buy",
      "senderAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
      "recipientAddress": "0x1234567890123456789012345678901234567890",
      "ethAmount": "500000000000000000",
      "tokenAmount": "5000000",
      "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "timestamp": "2024-07-21T08:30:00Z",
      "tokenPrice": "100000000000000"
    },
    // ... more transactions
  ],
  "totalCount": 30,
  "currentPage": 1,
  "totalPages": 3
}
```

#### Get Recent Transactions

Retrieves a list of recent transactions across all tokens on a specific chain.

- **URL:** `/api/transactions/:chain/recent`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/recent?page=1&pageSize=10
```

**Example Response:**
```json
{
  "transactions": [
    {
      "id": "456e7890-e12b-12d3-a456-426614174000",
      "type": "buy",
      "senderAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
      "recipientAddress": "0x1234567890123456789012345678901234567890",
      "ethAmount": "500000000000000000",
      "tokenAmount": "5000000",
      "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "timestamp": "2024-07-21T08:30:00Z",
      "tokenPrice": "100000000000000",
      "token": {
        "name": "Example Token",
        "symbol": "EXT"
      }
    },
    // ... more transactions
  ],
  "totalCount": 100,
  "currentPage": 1,
  "totalPages": 10
}
```

#### Get Transaction by Hash

Retrieves details of a specific transaction by its hash.

- **URL:** `/api/transactions/:chain/tx/:txHash`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `txHash` (required): The transaction hash

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/tx/0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

**Example Response:**
```json
{
  "id": "456e7890-e12b-12d3-a456-426614174000",
  "type": "buy",
  "senderAddress": "0xabcdef1234567890abcdef1234567890abcdef12",
  "recipientAddress": "0x1234567890123456789012345678901234567890",
  "ethAmount": "500000000000000000",
  "tokenAmount": "5000000",
  "txHash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
  "timestamp": "2024-07-21T08:30:00Z",
  "tokenPrice": "100000000000000"
}
```

#### Get Transaction Volume

Retrieves the transaction volume for a specific token within a given timeframe.

- **URL:** `/api/transactions/:chain/volume/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `timeframe` (optional): The timeframe for volume calculation (options: 'day', 'week', 'month', default: 'day')

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/volume/123e4567-e89b-12d3-a456-426614174000?timeframe=week
```

**Example Response:**
```json
{
  "volume": "1000000000000000000000"
}
```

#### Get Transaction Count

Retrieves the number of transactions for a specific token within a given timeframe.

- **URL:** `/api/transactions/:chain/count/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `timeframe` (optional): The timeframe for count calculation (options: 'day', 'week', 'month', default: 'day')

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/count/123e4567-e89b-12d3-a456-426614174000?timeframe=week
```

**Example Response:**
```json
{
  "count": 150
}
```

#### Get Latest Token Price

Retrieves the latest price of a specific token based on the most recent transaction.

- **URL:** `/api/transactions/:chain/price/latest/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/price/latest/123e4567-e89b-12d3-a456-426614174000
```

**Example Response:**
```json
{
  "price": "200000000000000"
}
```

#### Get Token Price History

Retrieves the price history of a specific token.

- **URL:** `/api/transactions/:chain/price/history/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `limit` (optional): Number of price points to retrieve (default: 100)

**Example Request:**
```
GET http://localhost:9007/api/transactions/shibarium/price/history/123e4567-e89b-12d3-a456-426614174000?limit=50
```

**Example Response:**
```json
[
  {
    "tokenPrice": "200000000000000",
    "timestamp": "2024-07-21T10:00:00Z"
  },
  {
    "tokenPrice": "195000000000000",
    "timestamp": "2024-07-21T09:00:00Z"
  },
  // ... more price data points
]
```

### Liquidity

#### Get Liquidity Events by Token ID

Retrieves a list of liquidity events for a specific token.

- **URL:** `/api/liquidity/:chain/token/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/token/123e4567-e89b-12d3-a456-426614174000?page=1&pageSize=10
```

**Example Response:**
```json
{
  "liquidityEvents": [
    {
      "id": "789e0123-e45b-12d3-a456-426614174000",
      "tokenId": "123e4567-e89b-12d3-a456-426614174000",
      "ethAmount": "1000000000000000000",
      "tokenAmount": "10000000",
      "txHash": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "timestamp": "2024-07-21T11:00:00Z"
    },
    // ... more liquidity events
  ],
  "totalCount": 30,
  "currentPage": 1,
  "totalPages": 3
}
```

#### Get Recent Liquidity Events

Retrieves a list of recent liquidity events across all tokens on a specific chain.

- **URL:** `/api/liquidity/:chain/recent`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
- **Query Params:**
  - `page` (optional): Page number for pagination (default: 1)
  - `pageSize` (optional): Number of items per page (default: 20)

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/recent?page=1&pageSize=10
```

**Example Response:**
```json
{
  "liquidityEvents": [
    {
      "id": "789e0123-e45b-12d3-a456-426614174000",
      "tokenId": "123e4567-e89b-12d3-a456-426614174000",
      "ethAmount": "1000000000000000000",
      "tokenAmount": "10000000",
      "txHash": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "timestamp": "2024-07-21T11:00:00Z",
      "token": {
        "name": "Example Token",
        "symbol": "EXT"
      }
    },
    // ... more liquidity events
  ],
  "totalCount": 100,
  "currentPage": 1,
  "totalPages": 10
}
```

#### Get Liquidity Event by Transaction Hash

Retrieves details of a specific liquidity event by its transaction hash.

- **URL:** `/api/liquidity/:chain/tx/:txHash`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `txHash` (required): The transaction hash of the liquidity event

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/tx/0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
```

**Example Response:**
```json
{
  "id": "789e0123-e45b-12d3-a456-426614174000",
  "tokenId": "123e4567-e89b-12d3-a456-426614174000",
  "ethAmount": "1000000000000000000",
  "tokenAmount": "10000000",
  "txHash": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "timestamp": "2024-07-21T11:00:00Z"
}
```

#### Get Total Liquidity for Token

Retrieves the total liquidity for a specific token.

- **URL:** `/api/liquidity/:chain/total/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/total/123e4567-e89b-12d3-a456-426614174000
```

**Example Response:**
```json
{
  "totalEthAmount": "10000000000000000000000",
  "totalTokenAmount": "100000000000"
}
```

#### Get Latest Liquidity Event for Token

Retrieves the most recent liquidity event for a specific token.

- **URL:** `/api/liquidity/:chain/latest/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/latest/123e4567-e89b-12d3-a456-426614174000
```

**Example Response:**
```json
{
  "id": "789e0123-e45b-12d3-a456-426614174000",
  "tokenId": "123e4567-e89b-12d3-a456-426614174000",
  "ethAmount": "1000000000000000000",
  "tokenAmount": "10000000",
  "txHash": "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  "timestamp": "2024-07-21T11:00:00Z"
}
```

#### Get Liquidity History

Retrieves the liquidity history for a specific token.

- **URL:** `/api/liquidity/:chain/history/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `limit` (optional): Number of history points to retrieve (default: 100)

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/history/123e4567-e89b-12d3-a456-426614174000?limit=50
```

**Example Response:**
```json
[
  {
    "ethAmount": "1000000000000000000",
    "tokenAmount": "10000000",
    "timestamp": "2024-07-21T11:00:00Z"
  },
  {
    "ethAmount": "500000000000000000",
    "tokenAmount": "5000000",
    "timestamp": "2024-07-21T10:00:00Z"
  },
  // ... more liquidity history points
]
```

#### Get Top Liquidity Tokens

Retrieves a list of tokens with the highest liquidity.

- **URL:** `/api/liquidity/:chain/top`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
- **Query Params:**
  - `limit` (optional): Number of top tokens to retrieve (default: 10)

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/top?limit=5
```

**Example Response:**
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Example Token",
    "symbol": "EXT",
    "address": "0x1234567890123456789012345678901234567890",
    "totalLiquidity": "10000000000000000000000"
  },
  // ... more tokens
]
```

#### Get Liquidity Added in Timeframe

Retrieves the amount of liquidity added for a specific token within a given timeframe.

- **URL:** `/api/liquidity/:chain/added/:tokenId`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network
  - `tokenId` (required): The unique identifier of the token
- **Query Params:**
  - `timeframe` (optional): The timeframe for liquidity calculation (options: 'day', 'week', 'month', default: 'day')

**Example Request:**
```
GET http://localhost:9007/api/liquidity/shibarium/added/123e4567-e89b-12d3-a456-426614174000?timeframe=week
```

**Example Response:**
```json
{
  "ethAmount": "5000000000000000000000",
  "tokenAmount": "50000000000"
}
```

### Price

#### Get Supported Chains

Retrieves a list of blockchain networks supported for price data.

- **URL:** `/api/price/supported-chains`
- **Method:** `GET`

**Example Request:**
```
GET http://localhost:9007/api/price/supported-chains
```

**Example Response:**
```json
{
  "supportedChains": ["shibarium", "ethereum", "binance-smart-chain"]
}
```

#### Get Price

Retrieves the current price of the native token for a specific blockchain network.

- **URL:** `/api/price/:chain/price`
- **Method:** `GET`
- **URL Params:**
  - `chain` (required): The blockchain network

**Example Request:**
```
GET http://localhost:9007/api/price/shibarium/price
```

**Example Response:**
```json
{
  "price": "0.000012"
}
```

## WebSocket

The API provides real-time updates through WebSocket connections. To connect to the WebSocket server, use the following URL:

```
wss://localhost:9007
```

### WebSocket Events

The WebSocket server emits the following events:

1. `connection`: Sent when a client successfully connects to the WebSocket server.
2. `tokenCreated`: Sent when a new token is created on the DEX.
3. `tokensBought`: Sent when a token purchase transaction occurs.
4. `tokensSold`: Sent when a token sell transaction occurs.
5. `liquidityAdded`: Sent when liquidity is added to a token pair.

### WebSocket Message Format

WebSocket messages are sent in JSON format with the following structure:

```json
{
  "type": "eventType",
  "data": {
    // Event-specific data
  }
}
```

Example of a `tokenCreated` event:

```json
{
  "type": "tokenCreated",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "chain": "shibarium",
    "address": "0x1234567890123456789012345678901234567890",
    "creatorAddress": "0x9876543210987654321098765432109876543210",
    "name": "New Token",
    "symbol": "NTK"
  }
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests. In case of an error, the response will include a JSON object with an `error` field describing the issue.

Common error codes:

- 400 Bad Request: The request was invalid or cannot be served.
- 404 Not Found: The requested resource could not be found.
- 500 Internal Server Error: The server encountered an unexpected condition that prevented it from fulfilling the request.

Example error response:

```json
{
  "error": "Token not found"
}
```


## Changelog

### Version 1.0.0 (2024-07-21)
- Initial release of the Multi-Chain PUMP API
- Support for token, transaction, liquidity, and price data
- WebSocket support for real-time updates

---

This concludes the comprehensive API documentation for the Multi-Chain Pump DEX. For any questions, issues, or feature requests, please open an issue on the GitHub repository.