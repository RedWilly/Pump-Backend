# Multi-Chain PUMP API

## Overview

It provides comprehensive data access and real-time updates for tokens, transactions, liquidity events, and pricing information.

## Features

- Support for multiple blockchain networks
- RESTful API endpoints for token, transaction, and liquidity data
- Real-time updates via WebSocket connections
- Price data retrieval for supported chains
- Pagination support for large data sets
- Detailed error handling and rate limiting

## Technologies Used

- Node.js
- TypeScript
- Express.js
- WebSocket (ws)
- PostgreSQL
- Drizzle ORM
- prisma (removed = slow)

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js (v14 or later)
- npm (v6 or later)
- PostgreSQL (v12 or later)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/RedWilly/Pump-Backend.git

   git checkout multi
   ```

2. Navigate to the project directory:
   ```
   cd Pump-Backend
   ```

3. Install the dependencies:
   ```
   npm install
   ```

4. Create a `.env` file in the root directory and add the following environment variables:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name
   PORT=9007
   ```
   Replace the `DATABASE_URL` with your actual PostgreSQL connection string.

## Database Setup

1. Create a new PostgreSQL database for the project.

2. Run the database migrations:
   ```
   npm run generate
   npm run migrate
   ```

## Usage

To start the server in development mode:

```
npm start
```

The server will start on the port specified in your `.env` file (default is 9007).

## API Documentation

For detailed API documentation, including all available endpoints and their usage, please refer to the [API Documentation](./API_DOCS.md).

## WebSocket

The API provides real-time updates through WebSocket connections. Connect to the WebSocket server at:

```
wss://localhost:9007
```

For more details on WebSocket events and message formats, see the [API Documentation](./API_DOCUMENTATION.md#websocket). websocket is not fully implemented yet but show it does work so :)

## Scripts

- `npm run generate`: Generate Drizzle ORM schema
- `npm run migrate`: Run database migrations
- `npm start`: Start the server


## Contributing

Contributions to the Multi-Chain PUMP API(PUMP-BACKEND) are welcome. Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)

## Contact

If you have any questions or feedback, please open an issue.