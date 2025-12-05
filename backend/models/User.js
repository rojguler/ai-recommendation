// User model - Handles database operations for users
const db = require('../config/database').promisePool;

class User {
  // Create a new user
  static async create(userData) {
    const { username, email, password } = userData;
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password]
    );
    return result.insertId;
  }

  // Find user by email
  static async findByEmail(email) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0];
  }

  // Find user by ID
  static async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, username, email, favorite_genres, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  // Update user favorite genres
  static async updateFavoriteGenres(userId, genres) {
    await db.execute(
      'UPDATE users SET favorite_genres = ? WHERE id = ?',
      [JSON.stringify(genres), userId]
    );
  }

  // Get user profile with preferences - optimized with single query
  static async getProfile(userId) {
    const user = await this.findById(userId);
    if (!user) return null;

    // Get liked and disliked movies in a single query for better performance
    const [preferences] = await db.execute(
      `SELECT m.*, ump.preference 
       FROM movies m 
       INNER JOIN user_movie_preferences ump ON m.id = ump.movie_id 
       WHERE ump.user_id = ?`,
      [userId]
    );

    // Separate liked and disliked movies
    const likedMovies = preferences.filter(p => p.preference === 'liked');
    const dislikedMovies = preferences.filter(p => p.preference === 'disliked');

    // Safely parse favorite_genres JSON
    let favoriteGenres = [];
    if (user.favorite_genres) {
      try {
        if (typeof user.favorite_genres === 'string') {
          favoriteGenres = JSON.parse(user.favorite_genres);
        } else {
          favoriteGenres = user.favorite_genres;
        }
      } catch (e) {
        console.error('Error parsing favorite_genres:', e);
        favoriteGenres = [];
      }
    }

    return {
      ...user,
      favorite_genres: favoriteGenres,
      liked_movies: likedMovies,
      disliked_movies: dislikedMovies
    };
  }
}

module.exports = User;

