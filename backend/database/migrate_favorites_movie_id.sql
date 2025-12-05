-- Migration: Change favorites.movie_id from INT to VARCHAR to support TMDB IDs
-- This allows storing both database movie IDs (integers) and TMDB IDs (tmdb_123 format)

USE cinesense;

-- Step 1: Drop foreign key constraint
ALTER TABLE favorites DROP FOREIGN KEY favorites_ibfk_2;

-- Step 2: Change movie_id column type to VARCHAR(255)
ALTER TABLE favorites MODIFY COLUMN movie_id VARCHAR(255) NOT NULL;

-- Step 3: Also update user_movie_preferences table for like/dislike
ALTER TABLE user_movie_preferences DROP FOREIGN KEY user_movie_preferences_ibfk_2;
ALTER TABLE user_movie_preferences MODIFY COLUMN movie_id VARCHAR(255) NOT NULL;

-- Note: We're not re-adding foreign keys because movie_id can now be either:
-- - An integer (database movie ID)
-- - A string (TMDB ID like "tmdb_123")
-- Foreign keys only work with exact matches, so we handle referential integrity in application code

