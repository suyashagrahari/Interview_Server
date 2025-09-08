# Interview Server

A scalable, production-ready Express.js backend server for the Interview Practice Platform with MongoDB, JWT authentication, and comprehensive security features.

## Features

- 🔐 **JWT Authentication** - Secure token-based authentication with refresh tokens
- 🔒 **Password Security** - Bcrypt hashing with configurable rounds
- 🛡️ **Security Middleware** - Helmet, CORS, rate limiting, XSS protection
- 📝 **Input Validation** - Comprehensive validation using express-validator
- 🗄️ **MongoDB Integration** - Mongoose ODM with optimized schemas
- 📊 **Logging** - Winston logger with multiple transports
- 🚀 **Performance** - Compression, caching, and optimized queries
- 🧪 **Testing Ready** - Jest configuration for unit and integration tests
- 📚 **API Documentation** - Well-documented endpoints with examples

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Security**: Helmet, CORS, Rate Limiting, XSS Protection
- **Validation**: express-validator
- **Logging**: Winston
- **Environment**: dotenv

## Quick Start

### Prerequisites

- Node.js 18 or higher
- MongoDB 4.4 or higher
- npm or yarn

### Installation

1. **Clone and navigate to the server directory**

   ```bash
   cd Interview_Server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Setup**

   ```bash
   cp env.example .env
   ```

4. **Start the server**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

| Method | Endpoint               | Description             | Access  |
| ------ | ---------------------- | ----------------------- | ------- |
| POST   | `/api/auth/signup`     | Register new user       | Public  |
| POST   | `/api/auth/signin`     | User login              | Public  |
| POST   | `/api/auth/google`     | Google OAuth            | Public  |
| POST   | `/api/auth/refresh`    | Refresh access token    | Public  |
| GET    | `/api/auth/profile`    | Get user profile        | Private |
| POST   | `/api/auth/logout`     | Logout user             | Private |
| POST   | `/api/auth/logout-all` | Logout from all devices | Private |

### Health Check

| Method | Endpoint  | Description          |
| ------ | --------- | -------------------- |
| GET    | `/health` | Server health status |

## API Usage Examples

### User Registration

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

### User Login

```bash
curl -X POST http://localhost:3001/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

### Get User Profile

```bash
curl -X GET http://localhost:3001/api/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Project Structure

```
src/
├── config/
│   └── database.js          # MongoDB connection configuration
├── controllers/
│   └── authController.js    # Authentication controller
├── middleware/
│   ├── auth.js             # JWT authentication middleware
│   ├── errorHandler.js     # Global error handling
│   ├── security.js         # Security middleware
│   └── validation.js       # Input validation
├── models/
│   └── User.js             # User model with Mongoose
├── routes/
│   └── auth.js             # Authentication routes
├── utils/
│   └── logger.js           # Winston logger configuration
├── app.js                  # Express app configuration
└── server.js               # Server entry point
```

## Security Features

- **Password Hashing**: Bcrypt with configurable rounds
- **JWT Tokens**: Secure access and refresh tokens
- **Rate Limiting**: Prevents brute force attacks
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **XSS Protection**: Input sanitization
- **NoSQL Injection**: MongoDB query sanitization
- **Input Validation**: Comprehensive request validation

## Environment Variables

| Variable               | Description               | Default       |
| ---------------------- | ------------------------- | ------------- |
| `NODE_ENV`             | Environment               | `development` |
| `PORT`                 | Server port               | `3001`        |
| `MONGODB_URI`          | MongoDB connection string | Required      |
| `JWT_SECRET`           | JWT signing secret        | Required      |
| `JWT_EXPIRE`           | JWT expiration time       | `7d`          |
| `JWT_REFRESH_SECRET`   | Refresh token secret      | Required      |
| `JWT_REFRESH_EXPIRE`   | Refresh token expiration  | `30d`         |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID    | Optional      |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret       | Optional      |
| `BCRYPT_ROUNDS`        | Password hashing rounds   | `12`          |

## Development

### Scripts

```bash
npm run dev          # Start development server with nodemon
npm start            # Start production server
npm test             # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
```

### Logging

Logs are written to:

- Console (development)
- `logs/error.log` (error logs)
- `logs/combined.log` (all logs)

## Production Deployment

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up MongoDB replica set
4. Configure reverse proxy (nginx)
5. Set up SSL certificates
6. Configure monitoring and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details
