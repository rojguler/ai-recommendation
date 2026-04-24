# 🎬 CineSense - AI-Powered Movie Recommendation System

A modern full-stack web application that provides personalized movie recommendations using Google Gemini AI. Built with React, Node.js, and MySQL.

[![React](https://img.shields.io/badge/Frontend-React%2018-blue?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=nodedotjs)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-orange?logo=mysql)](https://www.mysql.com/)
[![AI](https://img.shields.io/badge/AI-Google%20Gemini-purple?logo=google-gemini)](https://ai.google.dev/)

---

## 📖 Table of Contents

- [✨ Key Features](#-key_features)
- [🛠️ Tech Stack](#tech-stack)
- [🚀 Setup Instructions](#setup-instructions)
- [🔌 API Endpoints](#api-endpoints)
- [📊 Database Schema](#database-schema)
- [🚀 Technical Highlights](#-technical-highlights)

---

## ✨ Key Features

- **🤖 AI-Powered Recommendations**: Personalized movie suggestions using Google Gemini AI
- **🔐 Secure Authentication**: JWT-based authentication with password hashing
- **👤 User Profiles**: Customizable profiles with favorite genres and preferences
- **🎯 Smart Search**: AI-powered semantic search and traditional keyword search
- **❤️ Favorites System**: Save and manage your favorite movies
- **🎨 Modern UI**: Apple-inspired design with responsive layout
- **📱 Mobile-Friendly**: Fully responsive design for all devices
- **🔍 Movie Discovery**: Mood-based discovery with vibe tags
- **📊 Movie Details**: Comprehensive movie information with AI-generated summaries
- **⚡ Performance**: Redis caching for optimized performance

## Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **React Router DOM** - Client-side routing
- **Bootstrap 5** & **React Bootstrap** - Responsive UI components
- **React Icons** - Icon library
- **Axios** - HTTP client for API calls
- **Context API** - State management for authentication
- **Lazy Loading** - Code splitting for performance
- **Custom CSS** - Apple-inspired design system

### Backend
- **Node.js** & **Express.js** - RESTful API server
- **MySQL** - Relational database with optimized queries
- **JWT** - Secure token-based authentication
- **bcryptjs** - Password hashing (10 salt rounds)
- **Google Gemini AI** - Advanced AI recommendations
- **TMDB API** - Movie data and poster integration
- **Redis** - Caching layer for performance
- **Winston** - Structured logging
- **Helmet** - Security headers
- **Express Rate Limit** - API rate limiting
- **Swagger** - API documentation

## Project Structure

```
CineSense/
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth & security middleware
│   ├── models/          # Database models
│   ├── routes/          # API endpoints
│   ├── services/        # External services (Gemini, TMDB)
│   ├── database/        # SQL schema files
│   └── server.js        # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Page views
│   │   ├── context/     # State management
│   │   └── services/    # API integration
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8 or higher)
- Google Gemini API key

### Backend Setup

1. Navigate to the backend directory:
   `cd backend`

2. Install dependencies:
   `npm install`

3. Create a `.env` file based on `.env.example` and fill in your keys:
   `PORT=5000`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `GEMINI_API_KEY`, `TMDB_API_KEY`

4. Set up the database:
   `mysql -u root -p < database/schema.sql`

5. Start the server:
   `npm start`

### Frontend Setup

1. Navigate to the frontend directory:
   `cd frontend`

2. Install dependencies:
   `npm install`

3. Start the development server:
   `npm start`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Recommendations
- `GET /api/recommendations` - Get AI-powered suggestions

## 🚀 Technical Highlights

- **AI Integration**: Advanced prompt engineering with Google Gemini AI
- **Full-Stack**: Complete React + Node.js + MySQL implementation
- **Security**: JWT authentication and password hashing
- **Performance**: Redis caching and lazy loading
- **Documentation**: RESTful API with Swagger support
