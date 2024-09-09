# Bonding Curve Token Platform Backend

This README provides an overview of the Bonding Curve Token Platform backend, including setup instructions, architecture overview, and API documentation.

## How to Run

1. Install dependencies:
   ```
   npm install
   ```

2. Set up your environment variables:
   Create a `.env` file in the root directory and add your database URL:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
   ```

3. Generate Prisma client:
   ```
   npx prisma generate
   ```

4. Run database migrations:
   ```
   npx prisma migrate dev
   ```

5. Start the server:
   ```
   npm start
   ```

## Architecture Overview

This backend is built using Node.js with Express.js as the web framework. It uses Prisma as an ORM to interact with a PostgreSQL database. The application listens to blockchain events using Viem and updates the database accordingly.

Key components:

- **Express.js Server**: Handles HTTP requests and WebSocket connections.
- **Prisma ORM**: Manages database operations and schema.
- **Viem**: Interacts with the blockchain to listen for events.
- **WebSocket**: Provides real-time updates to connected clients.

## Database Schema

The database consists of three main models:

1. **Token**: Represents a bonding curve token.
2. **Transaction**: Represents buy/sell transactions for tokens.
3. **LiquidityEvent**: Represents liquidity addition events for tokens.

## API Endpoints

### Tokens

- `GET /api/tokens`: Get all tokens
- `GET /api/tokens/:id`: Get a specific token by ID
- `GET /api/tokens/address/:address`: Get a token by its blockchain address
- `GET /api/tokens/creator/:creatorAddress`: Get tokens created by a specific address

  Example request:
  ```
  GET /api/tokens/creator/0x1234567890123456789012345678901234567890?page=1&pageSize=20
  ```

  Example response:
  ```json
  {
    "tokens": [
      {
        "address": "0xabcdef1234567890abcdef1234567890abcdef12",
        "name": "Example Token",
        "symbol": "EXT",
        "logo": "https://example.com/logo.png",
        "description": "This is an example token",
        "creatorAddress": "0x1234567890123456789012345678901234567890"
      },
      // ... more tokens ...
    ],
    "totalCount": 50,
    "currentPage": 1,
    "totalPages": 3
  }
  ```

### Transactions

- `GET /api/transactions/token/:tokenId`: Get all transactions for a specific token

### Liquidity Events

- `GET /api/liquidity/token/:tokenId`: Get all liquidity events for a specific token

### Chats

- `POST /chats`: Add a new chat message
  - Request body:
    ```json
    {
      "user": "0x123",
      "token": "TOKEN123",
      "message": "Hello, world!",
      "reply_to": 1  // Optional: ID of the message being replied to
    }
    ```
  - Response:
    ```json
    {
      "id": 2
    }
    ```

- `GET /chats`: Get chat messages for a specific token
  - Query parameters:
    - `token`: The token for which to retrieve chat messages
  - Response:
    ```json
    [
      {
        "id": 1,
        "user": "0x123",
        "token": "TOKEN123",
        "message": "Hello, world!",
        "reply_to": null,
        "timestamp": "2023-10-01T12:00:00Z"
      },
      {
        "id": 2,
        "user": "0x456",
        "token": "TOKEN123",
        "message": "Hi there!",
        "reply_to": 1,
        "timestamp": "2023-10-01T12:05:00Z"
      }
    ]
    ```

## WebSocket

The server uses WebSocket to broadcast real-time updates to connected clients. Clients can connect to the WebSocket server to receive updates about new tokens, transactions, and liquidity events.

WebSocket events:

- `tokenCreated`: Broadcasted when a new token is created
- `tokensBought`: Broadcasted when tokens are bought
- `tokensSold`: Broadcasted when tokens are sold
- `liquidityAdded`: Broadcasted when liquidity is added to a token

## Blockchain Event Listeners

The application sets up listeners for the following blockchain events:

- `TokenCreated`: Triggered when a new token is created
- `TokensBought`: Triggered when tokens are bought
- `TokensSold`: Triggered when tokens are sold
- `LiquidityAdded`: Triggered when liquidity is added to a token

These events are processed and the corresponding database operations are performed to keep the backend data in sync with the blockchain state.

## Error Handling

The application includes basic error handling for API endpoints. More comprehensive error handling and logging can be implemented as needed.

## Future Improvements

- Implement authentication and authorization
- Add more comprehensive error handling and logging
- Implement rate limiting for API endpoints
- Add unit and integration tests
- Consider implementing caching for frequently accessed data