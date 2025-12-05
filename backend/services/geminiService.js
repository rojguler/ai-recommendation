// Gemini AI Service - Handles movie recommendations using Google Gemini API
const { GoogleGenerativeAI } = require('@google/generative-ai');
const TMDBService = require('./tmdbService');
const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  // Normalize user query - clean and sanitize input
  static normalizeQuery(q) {
    return q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, "")
      .trim();
  }

  // Generate movie recommendations based on user preferences
  static async getRecommendations(userPreferences) {
    const { favorite_genres = [], liked_movies = [], disliked_movies = [] } = userPreferences;

    // Build prompt for Gemini API
    const prompt = this.buildRecommendationPrompt(favorite_genres, liked_movies, disliked_movies);

    try {
      // Try gemini-1.5-pro first, fallback to gemini-pro
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      } catch (e) {
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        } catch (e2) {
          // If both fail, use fallback mock data
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('Gemini API models not available, using fallback recommendations');
          }
          return this.getFallbackRecommendations(favorite_genres, liked_movies, disliked_movies);
        }
      }
      
      // Configure generation for better quality and more creative, personalized responses
      const generationConfig = {
        temperature: 0.7, // Increased for more creative and personalized explanations
        topP: 0.95, // Increased for better quality
        topK: 40,
        maxOutputTokens: 4096 // Increased for more detailed explanations
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });
      const response = await result.response;
      const text = response.text();

      // Parse the response to extract movie recommendations
      return this.parseRecommendations(text);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Gemini API error details', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      
      // Check if it's an API key or quota error
      if (error.message && (error.message.includes('API_KEY') || error.message.includes('404'))) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Gemini API not accessible, using fallback recommendations');
        }
        return this.getFallbackRecommendations(favorite_genres, liked_movies, disliked_movies);
      }
      
      // For other errors, also use fallback
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Using fallback recommendations due to API error');
      }
      return this.getFallbackRecommendations(favorite_genres, liked_movies, disliked_movies);
    }
  }

  // Parse AI recommendations from JSON response
  static parseRecommendations(text) {
    try {
      // Try to extract JSON from the response (sometimes AI adds extra text)
      let jsonText = text.trim();
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Find JSON array in the text
      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonText);
      
      // Handle both direct array and object with recommendations property
      let recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);
      
      // Ensure all required fields are present
      // Note: genre and description will be fetched from TMDB, so they're optional here
      return recommendations.map(movie => ({
        title: movie.title || 'Unknown Movie',
        genre: movie.genre || null, // Will be fetched from TMDB
        year: movie.year || null, // Optional, helps with TMDB search
        description: movie.description || null, // Will be fetched from TMDB
        reason: movie.reason || `A great movie that matches your preferences.`,
        tagline: movie.tagline || null,
        mini_scene: movie.mini_scene || null
      }));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Error parsing recommendations', { error: error.message });
        logger.debug('Response text preview', text.substring(0, 500));
      }
      throw new Error('Failed to parse AI response');
    }
  }

  // Helper function to shuffle array (Fisher-Yates algorithm)
  static shuffleArray(array) {
    const shuffled = [...array];
    // Shuffle using current time as additional randomness factor
    const timeSeed = Date.now() % 10000;
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Combine standard random with time-based seed
      const randomValue = (Math.random() + (timeSeed % (i + 1)) / 1000) % 1;
      const j = Math.floor(randomValue * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Fallback recommendations when API is not available
  static getFallbackRecommendations(favoriteGenres, likedMovies = [], dislikedMovies = []) {
    // Get titles of disliked movies to filter them out
    const dislikedTitles = dislikedMovies.map(m => (m.title || '').toLowerCase().trim());
    const likedTitles = likedMovies.map(m => (m.title || '').toLowerCase().trim());
    
    const movieDatabase = {
      "Romance": [
        {
          title: "The Notebook",
          genre: "Romance",
          year: 2004,
          description: "A poor yet passionate young man falls in love with a rich young woman, giving her a sense of freedom, but they are soon separated because of their social differences.",
          reason: "A timeless romantic classic that captures the essence of true love and devotion. Perfect for romance lovers who enjoy emotional, heartfelt stories.",
          tagline: "Behind every great love is a great story.",
          mini_scene: "Noah reads to Allie from their notebook as she slowly remembers their love story. The rain falls outside the window as their memories come flooding back, a beautiful moment of reconnection."
        },
        {
          title: "Pride and Prejudice",
          genre: "Romance",
          year: 2005,
          description: "Sparks fly when spirited Elizabeth Bennet meets single, rich, and proud Mr. Darcy. But Mr. Darcy reluctantly finds himself falling in love with a woman beneath his class.",
          reason: "A beautifully crafted period romance with witty dialogue and complex characters. Based on Jane Austen's classic novel, it's perfect for those who love romantic dramas.",
          tagline: "Sometimes the last person on earth you want to be with is the one person you can't be without.",
          mini_scene: "Mr. Darcy walks through the misty morning field toward Elizabeth, declaring his love despite their differences. The tension between pride and love is palpable in this iconic scene."
        },
        {
          title: "La La Land",
          genre: "Romance",
          year: 2016,
          description: "While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.",
          reason: "A modern musical romance that beautifully captures the dreams and sacrifices of love. Perfect for those who enjoy both romance and music.",
          tagline: "Here's to the fools who dream.",
          mini_scene: "Mia and Sebastian dance among the stars at the Griffith Observatory, floating in a magical sequence that represents the dreamlike quality of their love."
        },
        {
          title: "500 Days of Summer",
          genre: "Romance",
          year: 2009,
          description: "An offbeat romantic comedy about a woman who doesn't believe true love exists, and the young man who falls for her.",
          reason: "A refreshing take on modern romance that subverts traditional love story tropes. Perfect for those who appreciate realistic and nuanced romantic narratives.",
          tagline: "This is not a love story. This is a story about love.",
          mini_scene: "Tom's expectations versus reality split screen shows the stark difference between his idealized vision and the actual breakup, a poignant moment of disillusionment."
        },
        {
          title: "Eternal Sunshine of the Spotless Mind",
          genre: "Romance",
          year: 2004,
          description: "When their relationship turns sour, a couple undergoes a medical procedure to have each other erased from their memories.",
          reason: "A unique and thought-provoking romance that explores memory, love, and second chances. Perfect for those who enjoy unconventional love stories.",
          tagline: "You can erase someone from your mind. Getting them out of your heart is another story.",
          mini_scene: "Joel and Clementine run through the collapsing memories of their relationship, trying to hold onto moments as they disappear, a beautiful metaphor for love's impermanence."
        },
        {
          title: "Before Sunrise",
          genre: "Romance",
          year: 1995,
          description: "A young man and woman meet on a train in Europe and wind up spending one evening together in Vienna.",
          reason: "An intimate and dialogue-driven romance that captures the magic of a chance encounter. Perfect for those who appreciate deep conversations and authentic connections.",
          tagline: "Can the greatest romance of your life last only one night?",
          mini_scene: "Jesse and Celine walk through Vienna, talking about life, love, and everything in between, creating an unforgettable connection in just one night."
        },
        {
          title: "Call Me by Your Name",
          genre: "Romance",
          year: 2017,
          description: "In 1980s Italy, romance blossoms between a seventeen-year-old student and the older man hired as his father's research assistant.",
          reason: "A beautiful and sensual coming-of-age romance set against the stunning Italian countryside. Perfect for those who appreciate poetic and emotional love stories.",
          tagline: "Is it better to speak or die?",
          mini_scene: "Elio and Oliver share a quiet moment by the water, their connection deepening as the summer sun sets, a moment of pure intimacy and understanding."
        },
        {
          title: "The Fault in Our Stars",
          genre: "Romance",
          year: 2014,
          description: "Two teenage cancer patients begin a life-affirming journey to visit a reclusive author in Amsterdam.",
          reason: "A heart-wrenching yet beautiful romance that finds love in the face of tragedy. Perfect for those who appreciate emotional depth and meaningful connections.",
          tagline: "One sick love story.",
          mini_scene: "Hazel and Gus share their first kiss in the Anne Frank House, a moment of pure love transcending their circumstances, surrounded by history and hope."
        }
      ],
      "Drama": [
        {
          title: "The Shawshank Redemption",
          genre: "Drama",
          year: 1994,
          description: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.",
          reason: "A timeless classic that appeals to drama lovers. This film is highly rated and offers deep emotional storytelling.",
          tagline: "Fear can hold you prisoner. Hope can set you free.",
          mini_scene: "Andy Dufresne stands in the rain, arms raised to the sky after escaping Shawshank prison. The moment of freedom after years of injustice, with hope finally realized."
        },
        {
          title: "Forrest Gump",
          genre: "Drama",
          year: 1994,
          description: "The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.",
          reason: "An emotional journey through American history with a heartwarming story. Perfect for drama enthusiasts who enjoy character-driven narratives.",
          tagline: "Life is like a box of chocolates, you never know what you're gonna get.",
          mini_scene: "Forrest sits on the bench, telling his life story to strangers. 'My mama always said life was like a box of chocolates,' he begins, in this iconic opening scene."
        },
        {
          title: "The Godfather",
          genre: "Drama",
          year: 1972,
          description: "The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.",
          reason: "A masterpiece of cinema that combines family drama with crime. Perfect for those who appreciate complex character development and storytelling.",
          tagline: "An offer you can't refuse.",
          mini_scene: "Michael Corleone sits in the restaurant, contemplating the murder he's about to commit. The tension builds as he makes the decision that will change his life forever."
        },
        {
          title: "Schindler's List",
          genre: "Drama",
          year: 1993,
          description: "In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce.",
          reason: "A powerful and moving drama about humanity in the face of horror. Perfect for those who appreciate historical dramas with deep emotional impact.",
          tagline: "Whoever saves one life, saves the world entire.",
          mini_scene: "The little girl in the red coat walks through the chaos of the ghetto liquidation, a symbol of innocence lost in a world of darkness."
        },
        {
          title: "The Green Mile",
          genre: "Drama",
          year: 1999,
          description: "The lives of guards on Death Row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.",
          reason: "A powerful drama about compassion, miracles, and the human condition. Perfect for those who appreciate emotional depth and moral complexity.",
          tagline: "Miracles happen in the most unexpected places.",
          mini_scene: "John Coffey heals Paul's infection with his touch, a moment of wonder and mystery that changes everything Paul thought he knew."
        },
        {
          title: "Good Will Hunting",
          genre: "Drama",
          year: 1997,
          description: "Will Hunting, a janitor at MIT, has a gift for mathematics but needs help from a psychologist to find direction in his life.",
          reason: "An inspiring drama about finding your path in life. Perfect for those who appreciate character growth and emotional journeys.",
          tagline: "Some people can never believe in themselves until someone believes in them.",
          mini_scene: "Sean tells Will 'It's not your fault' repeatedly, breaking through Will's emotional walls in a powerful moment of healing and acceptance."
        },
        {
          title: "The Pursuit of Happyness",
          genre: "Drama",
          year: 2006,
          description: "A struggling salesman takes custody of his son as he's poised to begin a life-changing professional career.",
          reason: "An inspiring true story about perseverance and never giving up. Perfect for those who appreciate uplifting dramas about overcoming adversity.",
          tagline: "The pursuit of happiness is the pursuit of life.",
          mini_scene: "Chris and his son sleep in a subway bathroom, Chris holding the door shut while his son sleeps, a moment of heartbreaking determination and love."
        },
        {
          title: "A Beautiful Mind",
          genre: "Drama",
          year: 2001,
          description: "After John Nash, a brilliant but asocial mathematician, accepts secret work in cryptography, his life takes a turn for the nightmarish.",
          reason: "A compelling drama about genius, mental illness, and love. Perfect for those who appreciate complex psychological narratives.",
          tagline: "The only thing greater than the power of the mind is the courage of the heart.",
          mini_scene: "Nash realizes that Marcee, the little girl, never ages, finally understanding that his delusions are not real, a moment of painful clarity."
        }
      ],
      "Action": [
        {
          title: "The Dark Knight",
          genre: "Action",
          year: 2008,
          description: "Batman faces the Joker, a criminal mastermind who seeks to undermine Batman's influence and create chaos in Gotham City.",
          reason: "One of the greatest superhero films ever made. Combines action, drama, and psychological depth in a compelling narrative.",
          tagline: "Why so serious?",
          mini_scene: "The Joker hangs upside down, laughing maniacally as Batman stands over him. 'You complete me,' he says, in a moment that defines their twisted relationship."
        },
        {
          title: "Mad Max: Fury Road",
          genre: "Action",
          year: 2015,
          description: "In a post-apocalyptic wasteland, Max teams up with a mysterious woman, Furiosa, to escape from a tyrannical warlord.",
          reason: "A high-octane action film with stunning visuals and non-stop thrills. Perfect for action movie enthusiasts.",
          tagline: "What a lovely day.",
          mini_scene: "Max and Furiosa race through the desert in a massive war rig, pursued by an army of vehicles. The dust, fire, and chaos create an unforgettable action sequence."
        },
        {
          title: "John Wick",
          genre: "Action",
          year: 2014,
          description: "An ex-hit-man comes out of retirement to track down the gangsters that took everything from him.",
          reason: "A stylish and intense action film with incredible fight choreography. Perfect for those who love well-executed action sequences.",
          tagline: "Don't set him off.",
          mini_scene: "John Wick methodically takes down enemies in a nightclub, each move precise and deadly, a masterclass in action filmmaking."
        },
        {
          title: "The Matrix",
          genre: "Action",
          year: 1999,
          description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
          reason: "A groundbreaking action film that combines philosophy with stunning visuals. Perfect for those who enjoy thought-provoking action.",
          tagline: "Welcome to the Real World.",
          mini_scene: "Neo dodges bullets in slow motion, bending reality itself as he realizes his true potential in the Matrix."
        },
        {
          title: "Gladiator",
          genre: "Action",
          year: 2000,
          description: "A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.",
          reason: "An epic historical action film with powerful performances and stunning battle sequences. Perfect for those who enjoy grand-scale action dramas.",
          tagline: "A hero will rise.",
          mini_scene: "Maximus reveals his identity in the Colosseum, 'My name is Maximus Decimus Meridius,' as the crowd roars, a moment of defiance and honor."
        },
        {
          title: "Mission: Impossible - Fallout",
          genre: "Action",
          year: 2018,
          description: "Ethan Hunt and his IMF team join forces with CIA assassin August Walker to prevent a disaster of epic proportions.",
          reason: "A thrilling action film with incredible stunts and non-stop excitement. Perfect for those who love high-stakes espionage action.",
          tagline: "Some missions are not a choice.",
          mini_scene: "Ethan Hunt performs a HALO jump over Paris, free-falling through the sky in a breathtaking sequence of pure action cinema."
        },
        {
          title: "The Bourne Identity",
          genre: "Action",
          year: 2002,
          description: "A man is picked up by a fishing boat, bullet-riddled and suffering from amnesia, before racing to elude assassins and regain his memory.",
          reason: "A smart and intense action thriller with realistic fight sequences. Perfect for those who appreciate grounded, intelligent action films.",
          tagline: "He was the perfect weapon until he became the target.",
          mini_scene: "Bourne uses a pen as a weapon in a close-quarters fight, demonstrating his lethal skills even without his memory."
        },
        {
          title: "Kill Bill: Vol. 1",
          genre: "Action",
          year: 2003,
          description: "After awakening from a four-year coma, a former assassin wreaks vengeance on the team of assassins who betrayed her.",
          reason: "A stylish and violent action film with incredible choreography. Perfect for those who enjoy artistic and intense action sequences.",
          tagline: "Revenge is a dish best served cold.",
          mini_scene: "The Bride faces off against the Crazy 88 in the House of Blue Leaves, a masterfully choreographed battle of epic proportions."
        }
      ],
      "Sci-Fi": [
        {
          title: "Inception",
          genre: "Sci-Fi",
          year: 2010,
          description: "A skilled thief is given a chance at redemption if he can successfully pull off an impossible heist: Inception, the planting of an idea into someone's subconscious.",
          reason: "A mind-bending sci-fi thriller that combines action with intellectual depth. Perfect for those who enjoy complex narratives.",
          tagline: "Your mind is the scene of the crime.",
          mini_scene: "The spinning top wobbles on the table as Cobb watches, unsure if he's still dreaming. The line between reality and dreams blurs in this iconic moment."
        },
        {
          title: "Interstellar",
          genre: "Sci-Fi",
          year: 2014,
          description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
          reason: "An epic sci-fi journey that combines science, emotion, and stunning visuals. Perfect for those who love space exploration and emotional depth.",
          tagline: "Mankind was born on Earth. It was never meant to die here.",
          mini_scene: "Cooper watches video messages from his children, years passing in minutes due to time dilation. The emotional weight of lost time hits him in this powerful scene."
        },
        {
          title: "Blade Runner 2049",
          genre: "Sci-Fi",
          year: 2017,
          description: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard.",
          reason: "A visually stunning sci-fi noir that explores what it means to be human. Perfect for those who appreciate atmospheric and thought-provoking science fiction.",
          tagline: "The key to the future is finally unearthed.",
          mini_scene: "K stands in the rain, questioning his own memories and identity, as the line between human and replicant becomes increasingly blurred."
        },
        {
          title: "The Matrix",
          genre: "Sci-Fi",
          year: 1999,
          description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
          reason: "A groundbreaking sci-fi film that questions reality itself. Perfect for those who enjoy philosophical science fiction with incredible action.",
          tagline: "Welcome to the Real World.",
          mini_scene: "Neo chooses the red pill, waking up in the real world for the first time, his entire understanding of reality shattered."
        },
        {
          title: "Arrival",
          genre: "Sci-Fi",
          year: 2016,
          description: "A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.",
          reason: "A thoughtful and emotional sci-fi film that explores communication and time. Perfect for those who appreciate intelligent and moving science fiction.",
          tagline: "Why are they here?",
          mini_scene: "Louise touches the alien glass, experiencing visions of her future daughter, understanding that time is not linear but circular."
        },
        {
          title: "Ex Machina",
          genre: "Sci-Fi",
          year: 2014,
          description: "A young programmer is selected to participate in a breakthrough experiment in artificial intelligence by evaluating the human qualities of a highly advanced humanoid A.I.",
          reason: "A tense and thought-provoking sci-fi thriller about AI and consciousness. Perfect for those who enjoy psychological science fiction.",
          tagline: "There is nothing more human than the will to survive.",
          mini_scene: "Ava manipulates Caleb into helping her escape, revealing the true nature of her intelligence and the danger it poses."
        },
        {
          title: "Her",
          genre: "Sci-Fi",
          year: 2013,
          description: "In a near future, a lonely writer develops an unlikely relationship with an operating system designed to meet his every need.",
          reason: "A beautiful and emotional sci-fi romance about love and connection in the digital age. Perfect for those who appreciate thoughtful and heartfelt science fiction.",
          tagline: "A Spike Jonze Love Story.",
          mini_scene: "Theodore and Samantha share an intimate moment, her voice expressing emotions that feel more real than any human connection he's known."
        },
        {
          title: "District 9",
          genre: "Sci-Fi",
          year: 2009,
          description: "An extraterrestrial race forced to live in slum-like conditions on Earth suddenly finds a kindred spirit in a government agent exposed to their biotechnology.",
          reason: "A unique sci-fi film that uses aliens as a metaphor for social issues. Perfect for those who enjoy thought-provoking science fiction with social commentary.",
          tagline: "You are not welcome here.",
          mini_scene: "Wikus begins transforming into a prawn, his body changing as he realizes he's becoming the very thing he once oppressed."
        }
      ],
      "Comedy": [
        {
          title: "The Grand Budapest Hotel",
          genre: "Comedy",
          year: 2014,
          description: "A writer encounters the owner of an aging hotel who tells him of his early years serving as a lobby boy in the hotel's glorious years under an exceptional concierge.",
          reason: "A whimsical and visually stunning comedy with quirky characters and delightful humor. Perfect for those who enjoy sophisticated comedy.",
          tagline: "A murder. A mystery. A hotel.",
          mini_scene: "M. Gustave and Zero race through the hotel corridors, evading authorities in a perfectly choreographed, comedic chase sequence."
        },
        {
          title: "The Big Lebowski",
          genre: "Comedy",
          year: 1998,
          description: "Jeff 'The Dude' Lebowski, mistaken for a millionaire of the same name, seeks restitution for his ruined rug and enlists his bowling buddies to help get it.",
          reason: "A cult classic comedy with unforgettable characters and quotable dialogue. Perfect for those who enjoy offbeat and absurd humor.",
          tagline: "The Dude abides.",
          mini_scene: "The Dude's rug is peed on, setting off a chain of events that leads him into a bizarre kidnapping plot, all while he just wants his rug back."
        },
        {
          title: "Superbad",
          genre: "Comedy",
          year: 2007,
          description: "Two co-dependent high school seniors are forced to deal with separation anxiety after their plan to stage a booze-soaked party goes awry.",
          reason: "A hilarious coming-of-age comedy about friendship and growing up. Perfect for those who enjoy raunchy but heartfelt comedies.",
          tagline: "Come and get some.",
          mini_scene: "Seth and Evan's friendship is tested as they try to buy alcohol for a party, leading to a night of misadventures and self-discovery."
        },
        {
          title: "Groundhog Day",
          genre: "Comedy",
          year: 1993,
          description: "A weatherman finds himself inexplicably living the same day over and over again.",
          reason: "A brilliant comedy that explores personal growth through repetition. Perfect for those who appreciate clever and meaningful humor.",
          tagline: "He's having the worst day of his life... over, and over...",
          mini_scene: "Phil wakes up to the same song, the same day, again and again, slowly realizing he's trapped in an endless loop of February 2nd."
        },
        {
          title: "Borat",
          genre: "Comedy",
          year: 2006,
          description: "Kazakh TV talking head Borat is dispatched to America to report on the greatest country in the world.",
          reason: "A hilarious and satirical mockumentary that exposes cultural differences. Perfect for those who enjoy edgy and provocative comedy.",
          tagline: "Very nice!",
          mini_scene: "Borat runs through a hotel convention naked, chasing his producer in one of the most outrageous and memorable comedy sequences ever filmed."
        },
        {
          title: "The Hangover",
          genre: "Comedy",
          year: 2009,
          description: "Three buddies wake up from a bachelor party in Las Vegas, with no memory of the previous night and the bachelor missing.",
          reason: "A wild and unpredictable comedy about a night gone wrong. Perfect for those who enjoy outrageous and unpredictable humor.",
          tagline: "Some guys just can't handle Vegas.",
          mini_scene: "The guys wake up in their destroyed hotel room with no memory, a tiger in the bathroom, and the groom missing, beginning their chaotic search."
        }
      ],
      "Thriller": [
        {
          title: "Gone Girl",
          genre: "Thriller",
          year: 2014,
          description: "With his wife's disappearance having become the focus of the media, a man sees the spotlight turned on him when it's suspected that he may not be innocent.",
          reason: "A psychological thriller with twists and turns that keep you guessing. Perfect for thriller enthusiasts who enjoy complex narratives.",
          tagline: "You don't know what you've got 'til it's...",
          mini_scene: "Nick stands in front of the media, smiling awkwardly as questions about his missing wife swirl around him. The tension between public image and private truth is palpable."
        },
        {
          title: "Se7en",
          genre: "Thriller",
          year: 1995,
          description: "Two detectives, a rookie and a veteran, hunt a serial killer who uses the seven deadly sins as his motives.",
          reason: "A dark and intense thriller with a shocking ending. Perfect for those who enjoy psychological thrillers with moral complexity.",
          tagline: "Seven deadly sins. Seven ways to die.",
          mini_scene: "The box is opened, revealing the final sin, as Mills realizes the true horror of what he's been lured into, a moment of devastating realization."
        },
        {
          title: "The Silence of the Lambs",
          genre: "Thriller",
          year: 1991,
          description: "A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.",
          reason: "A masterful psychological thriller with unforgettable characters. Perfect for those who appreciate intelligent and suspenseful thrillers.",
          tagline: "To enter the mind of a killer she must challenge the mind of a madman.",
          mini_scene: "Hannibal Lecter and Clarice Starling have their first conversation, a tense psychological battle of wits in the maximum security facility."
        },
        {
          title: "Shutter Island",
          genre: "Thriller",
          year: 2010,
          description: "In 1954, a U.S. Marshal investigates the disappearance of a murderess who escaped from a hospital for the criminally insane.",
          reason: "A mind-bending thriller that keeps you guessing until the end. Perfect for those who enjoy psychological mysteries with shocking twists.",
          tagline: "Someone is missing.",
          mini_scene: "Teddy realizes the truth about his identity, the walls of his reality crumbling as he understands he's been living a delusion."
        },
        {
          title: "Zodiac",
          genre: "Thriller",
          year: 2007,
          description: "Between 1968 and 1983, a San Francisco cartoonist becomes an amateur detective obsessed with tracking down the Zodiac Killer.",
          reason: "A meticulous and atmospheric thriller about obsession and unsolved mysteries. Perfect for those who enjoy detailed and suspenseful crime thrillers.",
          tagline: "There's more than one way to lose your life to a killer.",
          mini_scene: "Robert Graysmith sits in the basement, surrounded by evidence, as he gets closer to the truth, the weight of the unsolved mystery pressing down on him."
        },
        {
          title: "Prisoners",
          genre: "Thriller",
          year: 2013,
          description: "When Keller Dover's daughter and her friend go missing, he takes matters into his own hands as the police pursue multiple leads.",
          reason: "A tense and morally complex thriller about desperation and justice. Perfect for those who appreciate dark and thought-provoking thrillers.",
          tagline: "Every moment matters.",
          mini_scene: "Keller makes a desperate decision, crossing a line he never thought he would, as the search for his daughter becomes increasingly desperate."
        }
      ],
      "Horror": [
        {
          title: "Get Out",
          genre: "Horror",
          year: 2017,
          description: "A young African-American visits his white girlfriend's parents for the weekend, where his uneasiness about their reception of him eventually reaches a boiling point.",
          reason: "A thought-provoking horror film that combines social commentary with genuine scares. Perfect for horror fans who enjoy deeper meaning.",
          tagline: "Just because you're invited, doesn't mean you're welcome.",
          mini_scene: "Chris realizes he's been hypnotized and tries to escape, pulling cotton from the chair arms as he fights to break free from the sunken place."
        },
        {
          title: "The Shining",
          genre: "Horror",
          year: 1980,
          description: "A family heads to an isolated hotel for the winter where a sinister presence influences the father into violence, while his psychic son sees horrific forebodings.",
          reason: "A masterpiece of psychological horror that builds tension through atmosphere. Perfect for those who appreciate slow-burn horror with psychological depth.",
          tagline: "The tide of terror that swept America IS HERE.",
          mini_scene: "Jack breaks through the door with an axe, 'Here's Johnny!' as he descends into madness, a moment of pure terror and psychological breakdown."
        },
        {
          title: "Hereditary",
          genre: "Horror",
          year: 2018,
          description: "A grieving family is haunted by tragic and disturbing occurrences.",
          reason: "A deeply unsettling horror film that explores grief and family trauma. Perfect for those who appreciate atmospheric and emotionally devastating horror.",
          tagline: "Every family tree hides a secret.",
          mini_scene: "Annie discovers her mother's decapitated head, the horror of the family's dark secret finally revealed in a moment of pure terror."
        },
        {
          title: "The Exorcist",
          genre: "Horror",
          year: 1973,
          description: "When a 12-year-old girl is possessed by a mysterious entity, her mother seeks the help of two priests to save her.",
          reason: "A classic horror film that remains one of the most terrifying ever made. Perfect for those who appreciate traditional horror with psychological depth.",
          tagline: "The movie you've been waiting for... without the wait.",
          mini_scene: "Regan's head spins around, her voice changing as the demon speaks through her, a moment that has terrified audiences for decades."
        },
        {
          title: "It Follows",
          genre: "Horror",
          year: 2014,
          description: "A young woman is followed by an unknown supernatural force after a sexual encounter.",
          reason: "A unique and atmospheric horror film with a simple but terrifying premise. Perfect for those who enjoy psychological horror with a modern twist.",
          tagline: "It doesn't think. It doesn't feel. It doesn't give up.",
          mini_scene: "Jay sees the entity walking toward her, slowly and relentlessly, a figure that only she can see, representing an inescapable fate."
        },
        {
          title: "The Conjuring",
          genre: "Horror",
          year: 2013,
          description: "Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.",
          reason: "A well-crafted horror film with effective scares and strong atmosphere. Perfect for those who enjoy traditional haunted house horror.",
          tagline: "Based on the true case files of the Warrens.",
          mini_scene: "The clapping hands appear behind the door, a simple but terrifying moment that builds tension through suggestion and atmosphere."
        }
      ]
    };

    // Filter out disliked movies and already liked movies
    const filterMovies = (movies) => {
      return movies.filter(m => {
        const titleLower = (m.title || '').toLowerCase().trim();
        return !dislikedTitles.includes(titleLower) && !likedTitles.includes(titleLower);
      });
    };

    // If user has favorite genres, ONLY show movies from those genres
    if (favoriteGenres && favoriteGenres.length > 0) {
      const recommendations = [];
      
      // Collect movies from favorite genres only
      for (const genre of favoriteGenres) {
        const genreKey = Object.keys(movieDatabase).find(k => 
          k.toLowerCase() === genre.toLowerCase() ||
          genre.toLowerCase().includes(k.toLowerCase()) ||
          k.toLowerCase().includes(genre.toLowerCase())
        );
        
        if (genreKey && movieDatabase[genreKey]) {
          const filtered = filterMovies(movieDatabase[genreKey]);
          recommendations.push(...filtered);
        }
      }
      
      // Remove duplicates
      const uniqueRecommendations = recommendations.filter((movie, index, self) =>
        index === self.findIndex((m) => m.title === movie.title)
      );
      
      // Shuffle to get different recommendations each time
      const shuffled = this.shuffleArray(uniqueRecommendations);
      
      // If we have enough recommendations from favorite genres, return 3 random ones
      if (shuffled.length >= 3) {
        // Shuffle multiple times and start from a random position for variety
        let finalShuffled = this.shuffleArray(shuffled);
        finalShuffled = this.shuffleArray(finalShuffled);
        
        // Start from a random position in the array
        const startIndex = Math.floor(Math.random() * (finalShuffled.length - 2));
        const selected = [];
        
        // Take 3 movies starting from random position, wrapping around if needed
        for (let i = 0; i < 3; i++) {
          const index = (startIndex + i) % finalShuffled.length;
          selected.push(finalShuffled[index]);
        }
        
        // Shuffle the selected 3 one more time for extra randomness
        return this.shuffleArray(selected);
      }
      
      // If we have some but not enough, return what we have (shuffled)
      if (shuffled.length > 0) {
        return shuffled;
      }
      
      // If no movies found in favorite genres (all filtered out), show message in reason
      logger.warn('No movies found in favorite genres after filtering', {
        favoriteGenres
      });
    }

    // If no favorite genres, return a random mix from all genres
    const allMovies = Object.values(movieDatabase).flat();
    const filtered = filterMovies(allMovies);
    
    // Remove duplicates
    const uniqueMovies = filtered.filter((movie, index, self) =>
      index === self.findIndex((m) => m.title === movie.title)
    );
    
    const shuffled = this.shuffleArray(uniqueMovies);
    
    // Return 3 random movies using random selection
    const result = [];
    const usedIndices = new Set();
    
    // Try to get movies from different genres first
    const usedGenres = new Set();
    for (let i = 0; i < shuffled.length && result.length < 3; i++) {
      const randomIndex = Math.floor(Math.random() * shuffled.length);
      if (!usedIndices.has(randomIndex)) {
        const movie = shuffled[randomIndex];
        if (!usedGenres.has(movie.genre) || result.length >= 2) {
          usedIndices.add(randomIndex);
          usedGenres.add(movie.genre);
          result.push(movie);
        }
      }
    }
    
    // Fill remaining slots if needed with completely random selection
    while (result.length < 3 && usedIndices.size < shuffled.length) {
      const randomIndex = Math.floor(Math.random() * shuffled.length);
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex);
        const movie = shuffled[randomIndex];
        if (!result.some(r => r.title === movie.title)) {
          result.push(movie);
        }
      }
    }
    
    return result.slice(0, 3);
  }

  // Analyze user preferences to extract patterns and insights
  static analyzeUserPreferences(genres, likedMovies, dislikedMovies) {
    const analysis = {
      primaryGenres: [],
      secondaryGenres: [],
      preferredEras: [],
      preferredThemes: [],
      preferredTones: [],
      diversityLevel: 'mixed'
    };

    // Analyze genres
    if (genres.length > 0) {
      analysis.primaryGenres = genres.slice(0, 2);
      analysis.secondaryGenres = genres.slice(2);
    }

    // Analyze liked movies for patterns
    if (likedMovies.length > 0) {
      const genreCounts = {};
      const yearRanges = [];
      const themes = [];
      
      likedMovies.forEach(m => {
        const movie = typeof m === 'string' ? { title: m } : m;
        
        // Count genres
        if (movie.genre) {
          genreCounts[movie.genre] = (genreCounts[movie.genre] || 0) + 1;
        }
        
        // Analyze years
        if (movie.year) {
          yearRanges.push(movie.year);
        }
        
        // Extract themes from tags
        if (movie.tags && Array.isArray(movie.tags)) {
          themes.push(...movie.tags);
        }
      });

      // Find most common genres in liked movies
      const sortedGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);
      
      if (sortedGenres.length > 0 && analysis.primaryGenres.length === 0) {
        analysis.primaryGenres = sortedGenres.slice(0, 2);
      }

      // Analyze year preferences
      if (yearRanges.length > 0) {
        const avgYear = yearRanges.reduce((a, b) => a + b, 0) / yearRanges.length;
        if (avgYear < 1990) analysis.preferredEras.push('classic');
        else if (avgYear < 2010) analysis.preferredEras.push('modern');
        else analysis.preferredEras.push('contemporary');
      }

      // Analyze themes
      const themeCounts = {};
      themes.forEach(theme => {
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });
      analysis.preferredThemes = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme]) => theme);
    }

    // Determine diversity preference
    if (genres.length > 3 || likedMovies.length > 5) {
      analysis.diversityLevel = 'high';
    } else if (genres.length === 1 && likedMovies.length < 3) {
      analysis.diversityLevel = 'focused';
    }

    return analysis;
  }

  // Build the prompt for movie recommendations
  static buildRecommendationPrompt(genres, likedMovies, dislikedMovies) {
    const genresText = genres.length > 0 ? genres.join(', ') : 'Not specified';
    
    // Enhanced liked movies with more context
    const likedText = likedMovies.length > 0 
      ? likedMovies.map(m => {
          const movie = typeof m === 'string' ? { title: m } : m;
          let info = movie.title;
          if (movie.genre) info += ` (${movie.genre})`;
          if (movie.year) info += ` [${movie.year}]`;
          if (movie.tags && Array.isArray(movie.tags) && movie.tags.length > 0) {
            info += ` - tags: ${movie.tags.slice(0, 3).join(', ')}`;
          }
          if (movie.description) {
            const desc = movie.description.substring(0, 100);
            info += ` | ${desc}${desc.length < movie.description.length ? '...' : ''}`;
          }
          return info;
        }).join('; ')
      : 'None';
    
    const dislikedText = dislikedMovies.length > 0 
      ? dislikedMovies.map(m => {
          const movie = typeof m === 'string' ? { title: m } : m;
          return movie.title || m;
        }).join(', ')
      : 'None';

    // Deep analysis of user preferences
    const userAnalysis = this.analyzeUserPreferences(genres, likedMovies, dislikedMovies);
    
    // Build comprehensive analysis text
    let analysisText = '### USER PROFILE ANALYSIS\n\n';
    
    if (userAnalysis.primaryGenres.length > 0) {
      analysisText += `**Primary Genre Preferences:** ${userAnalysis.primaryGenres.join(', ')}\n`;
    }
    if (userAnalysis.secondaryGenres.length > 0) {
      analysisText += `**Secondary Interests:** ${userAnalysis.secondaryGenres.join(', ')}\n`;
    }
    
    if (likedMovies.length > 0) {
      analysisText += `\n**Liked Movies Analysis:**\n`;
      analysisText += `- Total liked: ${likedMovies.length} movie(s)\n`;
      analysisText += `- Liked movies: ${likedText}\n`;
      
      if (userAnalysis.preferredEras.length > 0) {
        analysisText += `- Preferred era: ${userAnalysis.preferredEras.join(', ')}\n`;
      }
      if (userAnalysis.preferredThemes.length > 0) {
        analysisText += `- Recurring themes: ${userAnalysis.preferredThemes.slice(0, 3).join(', ')}\n`;
      }
    } else {
      analysisText += `\n**New User:** No viewing history yet. Recommend critically acclaimed, accessible films.\n`;
    }
    
    if (dislikedMovies.length > 0) {
      analysisText += `\n**Avoid:** Films similar to ${dislikedText}\n`;
    }
    
    analysisText += `\n**Diversity Preference:** ${userAnalysis.diversityLevel === 'high' ? 'User enjoys variety - include diverse subgenres and styles' : userAnalysis.diversityLevel === 'focused' ? 'User has focused taste - stay within their preferred style' : 'Balanced approach - mix familiar and new'}\n`;

    const prompt = `You are an expert movie curator with encyclopedic knowledge of cinema history, from classic films to contemporary masterpieces. You understand not just genres, but the subtle nuances of tone, style, emotional resonance, and thematic depth that make films truly special.

Your expertise includes:
- Deep understanding of film history and cinematic movements
- Ability to identify thematic connections and stylistic similarities
- Knowledge of what makes films emotionally resonant and memorable
- Insight into how different films affect different viewers

${analysisText}

### YOUR MISSION
Recommend exactly 5 EXCEPTIONAL movies that feel personally curated for this specific user. These should not be generic recommendations, but films that demonstrate deep understanding of their unique taste.

### RECOMMENDATION STRATEGY
1. **Primary Match:** Films that align with their favorite genres: ${genresText}
2. **Tonal Similarity:** Movies that share the emotional tone, pacing, or atmosphere of their liked films
3. **Thematic Resonance:** Films that explore similar themes, character arcs, or narrative approaches
4. **Quality Assurance:** Only recommend genuinely great films - well-reviewed, impactful, and memorable
5. **Diversity:** ${userAnalysis.diversityLevel === 'high' ? 'Include variety: different eras, subgenres, and styles within their preferences' : userAnalysis.diversityLevel === 'focused' ? 'Stay focused on their preferred style, but include subtle variations' : 'Balance familiar favorites with fresh discoveries'}

### CRITICAL REQUIREMENTS FOR EACH RECOMMENDATION

**Reason (2-3 sentences):** 
- Be SPECIFIC and PERSONALIZED - reference their actual preferences
- Explain WHY this particular film matches their taste, not just that it's "good"
- Mention specific connections: "Like [their liked movie], this film explores..."
- Use natural, conversational language - you're a knowledgeable friend, not a robot
- Example: "Given your love for psychological thrillers like [movie], you'll appreciate how this film builds tension through character psychology rather than jump scares. The way it explores [theme] mirrors what you enjoyed in [their liked movie], but takes it in a fresh direction."

**Tagline:**
- Catchy, memorable, and captures the film's essence
- Should make someone want to watch it immediately

**Mini Scene (2-3 sentences):**
- Vivid, atmospheric description of a key moment
- Should give a "taste" of the film's style and emotional tone
- Make it cinematic and evocative

**IMPORTANT:** 
- Provide the EXACT movie title as it appears in TMDB/The Movie Database
- We will fetch all movie details (description, genre, year, poster) from TMDB automatically
- You only need to provide: title, reason, tagline, and mini_scene
- The title must be accurate so we can find it in TMDB

### OUTPUT FORMAT (JSON ONLY - NO MARKDOWN, NO EXPLANATIONS)
Return ONLY a valid JSON array with exactly 5 movies:

[
  {
    "title": "Exact Movie Title (as it appears in TMDB - must be accurate!)",
    "year": 2020,
    "reason": "Personalized explanation referencing their specific preferences (2-3 sentences)",
    "tagline": "Catchy tagline",
    "mini_scene": "Vivid scene description (2-3 sentences)"
  }
]

Note: We will get genre, description, and poster from TMDB automatically. Just provide the exact title and year (if you know it) to help us find the right movie.

Return ONLY the JSON array, nothing else.`;

    return prompt;
  }

  // Enhanced prompt preprocessing - extract intent, mood, genre, etc.
  static preprocessUserQuery(userDescription) {
    if (!userDescription || !userDescription.trim()) {
      return {
        original: '',
        cleaned: '',
        intent: 'general',
        moods: [],
        genres: [],
        keywords: []
      };
    }

    const original = userDescription.trim();
    const cleaned = original.toLowerCase();
    
    // Extract moods
    const moodPatterns = {
      'cozy': ['cozy', 'comfortable', 'warm', 'snug', 'comfort'],
      'dark': ['dark', 'disturbing', 'bleak', 'grim', 'depressing', 'heavy'],
      'emotional': ['emotional', 'touching', 'heartfelt', 'moving', 'tearjerker', 'crying', 'sad', 'beautiful'],
      'intense': ['intense', 'thrilling', 'suspenseful', 'gripping', 'edge-of-seat', 'fast-paced'],
      'slow': ['slow', 'contemplative', 'meditative', 'deliberate', 'atmospheric', 'slow burn'],
      'funny': ['funny', 'comedy', 'humor', 'hilarious', 'comic', 'laugh'],
      'aesthetic': ['aesthetic', 'visually stunning', 'beautiful', 'cinematic', 'stunning'],
      'mind-bending': ['mind-bending', 'complex', 'plot twist', 'twist', 'confusing', 'puzzle']
    };

    const detectedMoods = [];
    for (const [mood, keywords] of Object.entries(moodPatterns)) {
      if (keywords.some(kw => cleaned.includes(kw))) {
        detectedMoods.push(mood);
      }
    }

    // Extract genres
    const genrePatterns = {
      'horror': ['horror', 'scary', 'terror', 'frightening', 'korku'],
      'comedy': ['comedy', 'funny', 'humor', 'komedi'],
      'action': ['action', 'fight', 'explosive', 'combat', 'aksiyon'],
      'romance': ['romance', 'romantic', 'love', 'romcom', 'romantik', 'aşk'],
      'sci-fi': ['sci-fi', 'science fiction', 'space', 'futuristic', 'uzay', 'bilim kurgu'],
      'thriller': ['thriller', 'suspense', 'mystery', 'gerilim'],
      'drama': ['drama', 'dram', 'duygusal'],
      'war': ['war', 'military', 'battle', 'savaş', 'askeri']
    };

    const detectedGenres = [];
    for (const [genre, keywords] of Object.entries(genrePatterns)) {
      if (keywords.some(kw => cleaned.includes(kw))) {
        detectedGenres.push(genre);
      }
    }

    // Extract key terms (words longer than 3 chars, excluding common words)
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    const words = cleaned.split(/\s+/).filter(w => w.length > 3 && !commonWords.includes(w));
    const keywords = [...new Set(words)];

    // Determine intent
    let intent = 'general';
    if (cleaned.includes('like') || cleaned.includes('similar') || cleaned.includes('same as')) {
      intent = 'similar';
    } else if (cleaned.includes('recommend') || cleaned.includes('suggest') || cleaned.includes('find')) {
      intent = 'recommendation';
    } else if (detectedGenres.length > 0 && detectedMoods.length === 0) {
      intent = 'genre';
    } else if (detectedMoods.length > 0) {
      intent = 'mood';
    }

    return {
      original,
      cleaned,
      intent,
      moods: detectedMoods,
      genres: detectedGenres,
      keywords
    };
  }

  // Get custom recommendations based on user's text description
  static async getCustomRecommendations(userDescription, userPreferences = {}) {
    // Preprocess query to extract intent, moods, genres
    const queryAnalysis = this.preprocessUserQuery(userDescription);
    const cleanedQuery = queryAnalysis.cleaned || this.normalizeQuery(userDescription || '');
    const { favorite_genres = [], liked_movies = [], disliked_movies = [] } = userPreferences;
    const genresText = favorite_genres.length > 0 ? favorite_genres.join(', ') : 'Not specified';
    
    // Enrich liked movies with more details for better AI understanding
    const likedText = liked_movies.length > 0 
      ? liked_movies.map(m => {
          const movie = typeof m === 'string' ? { title: m } : m;
          return movie.genre 
            ? `${movie.title} (${movie.genre})`
            : movie.title;
        }).join(', ')
      : 'None';
    
    const dislikedText = disliked_movies.length > 0 
      ? disliked_movies.map(m => {
          const movie = typeof m === 'string' ? { title: m } : m;
          return movie.title || m;
        }).join(', ')
      : 'None';

    // Check if request is simple genre/topic based - use TMDB directly for faster, more reliable results
    // AI is unreliable for simple genre requests, so use TMDB when possible
    const simpleGenreKeywords = [
      'horror', 'scary', 'terror', 'frightening', 'spooky', 'korku', 'korkunç',
      'war', 'war movie', 'war film', 'military', 'battle', 'savaş', 'askeri',
      'comedy', 'funny', 'humor', 'komedi', 'komik',
      'action', 'action movie', 'fight', 'explosive', 'aksiyon', 'dövüş',
      'sci-fi', 'science fiction', 'space', 'futuristic', 'uzay', 'bilim kurgu',
      'romance', 'romantic', 'romcom', 'romantik', 'aşk',
      'thriller', 'suspense', 'mystery', 'gerilim',
      'drama', 'dram', 'duygusal'
    ];

    // Check if it's ONLY a simple genre keyword (not combined with other things)
    const descriptionLower = userDescription.toLowerCase().trim();
    const isOnlySimpleGenre = simpleGenreKeywords.some(keyword => {
      const keywordLower = keyword.toLowerCase();
      // Exact match or phrase match
      return descriptionLower === keywordLower || 
             descriptionLower === `${keywordLower} movie` ||
             descriptionLower === `${keywordLower} film` ||
             (descriptionLower.startsWith(keywordLower) && descriptionLower.split(/\s+/).length <= 3);
    });

    // If it's a simple genre request ONLY, use TMDB directly (AI is unreliable)
    if (isOnlySimpleGenre) {
      logger.info('Simple genre-only request detected, using TMDB', { userDescription });
      const tmdbResults = await this.getTMDBBasedRecommendations(userDescription);
      if (tmdbResults && tmdbResults.length >= 2) {
        return tmdbResults;
      }
      // If TMDB didn't return enough, fall through to AI (shouldn't happen)
      logger.info('TMDB returned insufficient results, falling back to AI', {
        resultCount: tmdbResults?.length || 0
      });
    } else {
      logger.info('Complex request detected, using AI', { userDescription });
    }

    // Build prompt with cleaned query
    const userGenres = genresText;
    const likedMovies = likedText;
    const dislikedMovies = dislikedText;
    
    // Enhanced prompt with better understanding
    const moodKeywords = {
      'dark': ['dark', 'disturbing', 'bleak', 'grim', 'depressing', 'heavy'],
      'light': ['light', 'uplifting', 'feel-good', 'happy', 'cheerful', 'positive'],
      'emotional': ['emotional', 'touching', 'heartfelt', 'moving', 'tearjerker', 'crying'],
      'funny': ['funny', 'comedy', 'humor', 'hilarious', 'comic', 'laugh'],
      'intense': ['intense', 'thrilling', 'suspenseful', 'gripping', 'edge-of-seat'],
      'slow': ['slow', 'contemplative', 'meditative', 'deliberate', 'atmospheric'],
      'fast': ['fast', 'action-packed', 'energetic', 'rapid', 'quick-paced']
    };

    const detectedMoods = [];
    const queryLower = cleanedQuery.toLowerCase();
    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(kw => queryLower.includes(kw))) {
        detectedMoods.push(mood);
      }
    }

    const moodContext = detectedMoods.length > 0 
      ? `Detected mood preferences: ${detectedMoods.join(', ')}.`
      : '';

    // Analyze user preferences for custom recommendations too
    const userAnalysis = this.analyzeUserPreferences(
      favorite_genres || [],
      liked_movies || [],
      disliked_movies || []
    );

    let analysisText = '### USER PROFILE ANALYSIS\n\n';
    if (userAnalysis.primaryGenres.length > 0) {
      analysisText += `**Primary Genre Preferences:** ${userAnalysis.primaryGenres.join(', ')}\n`;
    }
    if (likedMovies !== 'None') {
      analysisText += `**Liked Movies:** ${likedMovies}\n`;
    }
    if (userAnalysis.preferredEras.length > 0) {
      analysisText += `**Preferred Era:** ${userAnalysis.preferredEras.join(', ')}\n`;
    }
    if (userAnalysis.preferredThemes.length > 0) {
      analysisText += `**Recurring Themes:** ${userAnalysis.preferredThemes.slice(0, 3).join(', ')}\n`;
    }
    if (dislikedMovies !== 'None') {
      analysisText += `**Avoid:** Films similar to ${dislikedMovies}\n`;
    }

    // Build enhanced context from query analysis
    let enhancedContext = '';
    if (queryAnalysis.intent === 'similar') {
      enhancedContext += '**Intent:** User wants movies similar to something specific.\n';
    } else if (queryAnalysis.intent === 'mood') {
      enhancedContext += `**Intent:** User is looking for movies with specific mood/atmosphere.\n`;
      enhancedContext += `**Detected Moods:** ${queryAnalysis.moods.join(', ')}\n`;
    } else if (queryAnalysis.intent === 'genre') {
      enhancedContext += `**Intent:** User wants movies in specific genre(s).\n`;
      enhancedContext += `**Detected Genres:** ${queryAnalysis.genres.join(', ')}\n`;
    }
    
    if (queryAnalysis.keywords.length > 0) {
      enhancedContext += `**Key Terms:** ${queryAnalysis.keywords.slice(0, 5).join(', ')}\n`;
    }

    const prompt = `You are an expert movie curator with encyclopedic knowledge of cinema. The user is searching for: "${queryAnalysis.original || cleanedQuery}"

${analysisText}

### QUERY ANALYSIS
${enhancedContext}
### CONTEXT ANALYSIS
${moodContext}

### YOUR MISSION
Find exactly 3 PERFECT movies that match "${cleanedQuery}" - not just surface-level genre matches, but films that capture the ESSENCE, MOOD, and SPIRIT of what the user is seeking.

Think deeply about what they're really asking for:
- If they say "something sad" → they want emotional depth, not just a sad ending
- If they say "mind-bending" → they want complex narratives that challenge perception
- If they say "cozy" → they want warmth, comfort, atmospheric films
- If they say "intense" → they want gripping, high-stakes narratives

### CRITICAL REQUIREMENTS
1. **Perfect Match:** ALL 3 movies MUST match the user's request. If they said "horror", ALL must be horror. If they said "romantic comedy", ALL must be romantic comedies. No exceptions.
2. **Personalization:** Each recommendation should feel like it was chosen specifically for THIS user, considering their profile above.
3. **Quality:** Only recommend genuinely great films - well-reviewed, impactful, memorable.
4. **Each movie needs:**
   - A compelling, personalized reason (2-3 sentences) explaining why THIS specific movie is perfect for their request AND matches their taste profile
   - A catchy tagline that captures the film's essence
   - A vivid "mini scene" (2-3 sentences) that captures the movie's atmosphere and gives a taste of what makes it special
   - Accurate genre and year
5. Be insightful and specific - explain WHY each movie matches, don't just list titles
6. Consider: mood, tone, pacing, themes, visual style, emotional impact

**IMPORTANT:** 
- Provide the EXACT movie title as it appears in TMDB/The Movie Database
- We will fetch all movie details (description, genre, year, poster) from TMDB automatically
- You only need to provide: title, year (if known), reason, tagline, and mini_scene
- The title must be accurate so we can find it in TMDB

### OUTPUT FORMAT (JSON ONLY - NO MARKDOWN, NO EXPLANATIONS)
Return ONLY a valid JSON array with exactly 3 movies:

[
  {
    "title": "Exact Movie Title (as it appears in TMDB - must be accurate!)",
    "year": 2020,
    "reason": "Personalized explanation referencing their request and taste profile (2-3 sentences)",
    "tagline": "Catchy tagline",
    "mini_scene": "Vivid scene description (2-3 sentences)"
  }
]

Note: We will get genre, description, and poster from TMDB automatically. Just provide the exact title and year (if you know it) to help us find the right movie.

Return ONLY the JSON array, nothing else.`;

    try {
      let model;
      let modelName = 'gemini-1.5-pro';
      
      try {
        model = genAI.getGenerativeModel({ model: modelName });
      } catch (e) {
        logger.warn(`Failed to get ${modelName}, trying gemini-pro`, { error: e.message });
        modelName = 'gemini-pro';
        try {
          model = genAI.getGenerativeModel({ model: modelName });
        } catch (e2) {
          logger.warn('Gemini API models not available, using fallback recommendations', {
            error: e2.message
          });
          return this.getFallbackRecommendations(favorite_genres, liked_movies, disliked_movies);
        }
      }
      
      // Configure generation for better quality, creativity, and personalization
      const generationConfig = {
        temperature: 0.7, // Increased for more creative and personalized explanations
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096, // Increased for more detailed explanations
      };

      // Retry mechanism - try up to 2 times for better results
      let recommendations = [];
      let attempts = 0;
      const maxAttempts = 2;
      let currentPrompt = prompt;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          logger.debug('Gemini custom rec attempt', { attempts, maxAttempts, userDescription });
          
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: currentPrompt }] }],
            generationConfig: generationConfig,
          });
          const response = await result.response;
          const text = response.text();

          logger.debug('Gemini response received', {
            attempt: attempts,
            length: text.length,
            preview: text.substring(0, 200)
          });
          
          // Parse recommendations
          try {
            recommendations = this.parseRecommendations(text);
            if (!recommendations || recommendations.length === 0) {
              throw new Error('Empty recommendations array');
            }
            logger.debug('Parsed recommendations', {
              attempt: attempts,
              count: recommendations.length
            });
          } catch (parseError) {
            logger.error(`Attempt ${attempts}: Error parsing AI response`, { error: parseError.message });
            if (attempts < maxAttempts) {
              logger.info('Retrying Gemini request with stricter prompt');
              currentPrompt = prompt + `\n\nRETRY: Previous attempt failed to parse. Ensure you return ONLY valid JSON with exactly 3 movies.`;
              continue; // Retry
            } else {
              // All attempts failed, try TMDB fallback
              logger.warn('All parsing attempts failed, using TMDB fallback');
              return await this.getTMDBBasedRecommendations(userDescription);
            }
          }
          
          // Validate and filter recommendations
          const validated = await this.validateCustomRecommendations(recommendations, userDescription);
          
          // Calculate quality score
          const qualityScore = validated.length / recommendations.length;
          
          if (qualityScore >= 0.67 && validated.length >= 2) {
            // Good enough - return validated recommendations
            logger.info('Returning validated recommendations', {
              qualityScore: qualityScore.toFixed(2),
              validCount: validated.length
            });
            return validated.slice(0, 3);
          } else if (attempts < maxAttempts) {
            // If no valid movies and we have retries left, try again with stricter prompt
            if (validated.length === 0) {
              logger.warn('All recommendations invalid, retrying with stricter prompt', {
                attempt: attempts
              });
              currentPrompt = prompt + `\n\n❌ CRITICAL RETRY: Previous attempt returned movies that don't match "${userDescription}". You MUST return 3 movies that EXACTLY match the request. Check each movie: if user said "horror", ALL 3 must be horror. If user said "war", ALL 3 must be war. NO EXCEPTIONS.`;
            } else {
              // If some valid but not enough, try to improve
              logger.warn('Partial valid recommendations, retrying', {
                attempt: attempts,
                validCount: validated.length,
                total: recommendations.length
              });
              currentPrompt = prompt + `\n\n⚠️ RETRY: Previous attempt returned ${validated.length} valid movies but ${recommendations.length - validated.length} invalid ones. Be MORE STRICT - ensure ALL 3 movies match "${userDescription}" exactly. Check each movie carefully before returning.`;
            }
            continue; // Retry
          } else {
            // Last attempt - return what we have or fallback
            if (validated.length > 0) {
              logger.info('Final attempt succeeded with validated recommendations', {
                count: validated.length
              });
              return validated.slice(0, 3);
            } else {
              logger.warn('All attempts failed, using TMDB fallback');
              return await this.getTMDBBasedRecommendations(userDescription);
            }
          }
        } catch (apiError) {
          logger.error(`Attempt ${attempts}: Gemini API error`, { error: apiError.message });
          if (attempts >= maxAttempts) {
            // All attempts failed
            logger.warn('All Gemini API attempts failed, using TMDB fallback');
            return await this.getTMDBBasedRecommendations(userDescription);
          }
          // Continue to next attempt
        }
      }
      
      // Should not reach here, but just in case
      return await this.getTMDBBasedRecommendations(userDescription);
    } catch (error) {
      logger.logError(error);
      // Last resort: try TMDB
      try {
        logger.warn('Gemini failed, trying TMDB as last resort', { userDescription });
        const tmdbLastResort = await this.getTMDBBasedRecommendations(userDescription);
        if (tmdbLastResort && tmdbLastResort.length > 0) {
          return tmdbLastResort;
        }
      } catch (tmdbError) {
        logger.error('TMDB fallback also failed', { error: tmdbError.message });
      }
      
      // Ultimate fallback
      return this.getFallbackRecommendations(favorite_genres, liked_movies, disliked_movies);
    }
  }

  // Get similar movies to a given movie using AI
  static async getSimilarMovies(movieTitle, movieDescription, movieGenre) {
    const prompt = `Find 3 movies that are genuinely similar to "${movieTitle}".

Movie info:
- Genre: ${movieGenre || 'Unknown'}
- Description: "${movieDescription || 'No description available'}"

Think about what makes this movie special - its themes, tone, style, emotional impact, characters, narrative approach - and find other quality films that share those qualities. Don't just match the genre, find deeper connections.

**IMPORTANT:** 
- Provide the EXACT movie title as it appears in TMDB/The Movie Database
- We will fetch all movie details (description, genre, year, poster) from TMDB automatically
- You only need to provide: title, year (if known), reason, tagline, and mini_scene
- The title must be accurate so we can find it in TMDB

Return ONLY valid JSON, no extra text:

{
  "recommendations": [
    {
      "title": "Exact Movie Title (as it appears in TMDB - must be accurate!)",
      "year": 2020,
      "reason": "Explain why this movie is similar to '${movieTitle}' and what they have in common",
      "tagline": "A catchy tagline for this movie",
      "mini_scene": "A brief, engaging scene description (2-3 sentences) that captures the essence of the movie"
    },
    {
      "title": "Exact Movie Title 2 (as it appears in TMDB)",
      "year": 2021,
      "reason": "Explain why this movie is similar to '${movieTitle}' and what they have in common",
      "tagline": "Tagline",
      "mini_scene": "Scene description"
    },
    {
      "title": "Exact Movie Title 3 (as it appears in TMDB)",
      "year": 2022,
      "reason": "Explain why this movie is similar to '${movieTitle}' and what they have in common",
      "tagline": "Tagline",
      "mini_scene": "Scene description"
    }
  ]
}

Note: We will get genre, description, and poster from TMDB automatically. Just provide the exact title and year (if you know it) to help us find the right movie.`;

    try {
      let model;
      let modelName = 'gemini-1.5-pro';
      
      try {
        model = genAI.getGenerativeModel({ model: modelName });
      } catch (e) {
        logger.warn(`Failed to get ${modelName}, trying gemini-pro`, { error: e.message });
        modelName = 'gemini-pro';
        try {
          model = genAI.getGenerativeModel({ model: modelName });
        } catch (e2) {
          logger.warn('Gemini API models not available, using fallback recommendations', {
            error: e2.message
          });
          return [];
        }
      }
      
      const generationConfig = {
        temperature: 0.2,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2048,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });
      
      const response = await result.response;
      let text = response.text();
      
      // Clean up the response text
      text = text.trim();
      // Remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      try {
        // Try to find JSON object in the text
        let jsonText = text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonText);
        
        // Handle both formats: { recommendations: [...] } or just [...]
        let recommendations = [];
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          recommendations = parsed.recommendations;
        } else if (Array.isArray(parsed)) {
          recommendations = parsed;
        }
        
        if (recommendations.length > 0) {
          logger.info('Successfully parsed similar movies', { count: recommendations.length, movieTitle });
          return recommendations;
        } else {
          logger.warn('No recommendations found in parsed response', { movieTitle });
        }
      } catch (parseError) {
        logger.error('Error parsing similar movies response', { 
          error: parseError.message,
          textPreview: text.substring(0, 200),
          movieTitle 
        });
        
        // Try to extract recommendations manually if JSON parse fails
        try {
          // Look for title patterns in the text
          const titleMatches = text.match(/"title"\s*:\s*"([^"]+)"/g);
          if (titleMatches && titleMatches.length > 0) {
            logger.warn('Attempting manual extraction of recommendations', { movieTitle });
            // This is a fallback - return empty for now, but log it
          }
        } catch (extractError) {
          logger.error('Manual extraction also failed', { error: extractError.message });
        }
      }
      
      return [];
    } catch (error) {
      logger.error('Error getting similar movies', { error: error.message });
      return [];
    }
  }

  // Generate random movie trivia/fact using AI
  static async generateMovieTrivia() {
    const prompt = `Generate a random, interesting, and accurate movie trivia fact in English. 
The fact should be:
- About a well-known movie or film industry
- Interesting and surprising
- Accurate and factual
- Written in a casual, engaging style
- Maximum 150 words

Return ONLY the trivia text, no quotes, no extra formatting, just the fact itself.

Examples:
"The Shining's iconic 'Here's Johnny!' scene was filmed 127 times."
"Hereditary's final music contains 5 different reversed samples designed to disturb viewers."
"Before Sunrise was filmed with almost no script, relying heavily on improvisation."`;

    try {
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      } catch (e) {
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        } catch (e2) {
          return this.getFallbackTrivia();
        }
      }

      const generationConfig = {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 200
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });

      const response = await result.response;
      let text = response.text().trim();
      
      // Remove quotes if present
      text = text.replace(/^["']|["']$/g, '');
      
      return text || this.getFallbackTrivia();
    } catch (error) {
      logger.error('Error generating movie trivia', { error: error.message });
      return this.getFallbackTrivia();
    }
  }

  // Fallback trivia when AI is not available
  static getFallbackTrivia() {
    const fallbackFacts = [
      "The Shining's iconic 'Here's Johnny!' scene was filmed 127 times.",
      "Hereditary's final music contains 5 different reversed samples designed to disturb viewers.",
      "Before Sunrise was filmed with almost no script, relying heavily on improvisation.",
      "Inception's music is actually a slowed-down version of an Edith Piaf song.",
      "Fight Club's first rule: You don't talk about Fight Club.",
      "The Matrix's bullet time effect required 120 still cameras arranged in a circle.",
      "Pulp Fiction's famous dance scene was completely improvised by John Travolta and Uma Thurman.",
      "The Godfather's horse head scene used a real horse head from a dog food company.",
      "Blade Runner has 7 different versions, each with significant changes to the story.",
      "The Exorcist used real medical equipment and procedures to make the possession scenes more realistic."
    ];
    return fallbackFacts[Math.floor(Math.random() * fallbackFacts.length)];
  }

  // Generate AI genre suggestions based on query
  static async generateGenreSuggestions(query) {
    const prompt = `Given the search query: "${query}"

Suggest 3-5 specific sub-genres or movie categories that might interest this user.

For example:
- If query is "horror" → suggest: "psychological horror", "elevated horror", "slasher", "supernatural horror"
- If query is "romance" → suggest: "romantic comedy", "period romance", "dark romance", "coming-of-age romance"
- If query is "action" → suggest: "martial arts", "spy thriller", "heist", "superhero"

Return ONLY valid JSON array of strings:
["sub-genre 1", "sub-genre 2", "sub-genre 3"]`;

    try {
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      } catch (e) {
        model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      }

      const generationConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 200,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });

      const response = await result.response;
      const text = response.text();
      const suggestions = JSON.parse(text);
      
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      logger.error('Error generating genre suggestions', { error: error.message, query });
      return [];
    }
  }

  // Generate AI tags based on user query
  static async generateAITags(query) {
    const prompt = `Given the search query: "${query}"

Generate 5-8 AI-powered tags that capture the essence, mood, and style of movies matching this query.

These should be descriptive, emotive, and help users discover movies. Think: vibe, mood, style, themes.

Examples:
- Query "horror" → Tags: "slow burn", "psychological", "disturbing", "atmospheric", "jump scares", "dark humor"
- Query "romance in paris" → Tags: "aesthetic", "dreamy", "heartfelt", "cinematic", "nostalgic", "bittersweet"
- Query "space thriller" → Tags: "suspenseful", "claustrophobic", "mind-bending", "visually stunning", "existential"

Return ONLY valid JSON array of tag strings (lowercase):
["tag1", "tag2", "tag3"]`;

    try {
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      } catch (e) {
        model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      }

      const generationConfig = {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 300,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });

      const response = await result.response;
      const text = response.text();
      const tags = JSON.parse(text);
      
      return Array.isArray(tags) ? tags.map(tag => tag.toLowerCase()) : [];
    } catch (error) {
      logger.error('Error generating AI tags', { error: error.message, query });
      return [];
    }
  }

  // Generate AI tags for a specific movie based on title, description, and genre
  static async generateMovieTags(title, description, genre) {
    try {
      const prompt = `Given this movie:
Title: "${title}"
Genre: "${genre || 'Unknown'}"
Description: "${description || 'No description available'}"

Generate 5-8 descriptive tags that capture the movie's mood, style, themes, and appeal. These should help users discover similar films.

Think about: tone, atmosphere, pacing, emotional impact, visual style, themes, target audience.

Return ONLY valid JSON array of lowercase tag strings:
["tag1", "tag2", "tag3"]`;

      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      } catch (e) {
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        } catch (e2) {
          // Fallback to genre-based tags if AI unavailable
          return this.getFallbackTags(genre);
        }
      }

      const generationConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 300,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });

      const response = await result.response;
      const text = response.text();
      
      // Try to parse JSON response
      let tags = [];
      try {
        const parsed = JSON.parse(text);
        tags = Array.isArray(parsed) ? parsed : [];
      } catch (parseError) {
        // If parsing fails, extract array from text
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            tags = JSON.parse(jsonMatch[0]);
          } catch (e) {
            tags = [];
          }
        }
      }
      
      // Fallback if no valid tags
      if (!Array.isArray(tags) || tags.length === 0) {
        return this.getFallbackTags(genre);
      }
      
      return tags.map(tag => String(tag).toLowerCase()).filter(tag => tag.length > 0);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        logger.error('Error generating movie tags', { error: error.message, title, genre });
      }
      return this.getFallbackTags(genre);
    }
  }

  // Get fallback tags based on genre when AI is unavailable
  static getFallbackTags(genre) {
    const genreTagMap = {
      'Action': ['action-packed', 'explosive', 'thrilling', 'adrenaline', 'fast-paced', 'combat', 'heroic', 'stunt'],
      'Comedy': ['funny', 'humor', 'lighthearted', 'witty', 'entertaining', 'hilarious', 'comedy', 'laugh'],
      'Drama': ['emotional', 'character-driven', 'thought-provoking', 'dramatic', 'intense', 'powerful', 'touching', 'realistic'],
      'Horror': ['scary', 'suspenseful', 'thrilling', 'dark', 'atmospheric', 'frightening', 'intense', 'chilling'],
      'Romance': ['romantic', 'heartfelt', 'emotional', 'sweet', 'passionate', 'love', 'charming', 'tender'],
      'Sci-Fi': ['futuristic', 'scientific', 'imaginative', 'space', 'technology', 'visionary', 'innovative', 'speculative'],
      'Thriller': ['suspenseful', 'tense', 'gripping', 'mysterious', 'edge-of-seat', 'psychological', 'intense', 'unpredictable'],
      'Mystery': ['mysterious', 'puzzling', 'investigative', 'suspenseful', 'enigmatic', 'twist', 'intriguing', 'clue-based'],
      'Fantasy': ['magical', 'imaginative', 'epic', 'mythical', 'enchanting', 'wonder', 'supernatural', 'adventurous'],
      'War': ['intense', 'dramatic', 'historical', 'action-packed', 'emotional', 'gritty', 'realistic', 'patriotic'],
      'Crime': ['dark', 'suspenseful', 'gritty', 'criminal', 'investigative', 'thrilling', 'intense', 'realistic']
    };

    const genreKey = genre || 'Drama';
    const matchedGenre = Object.keys(genreTagMap).find(
      g => g.toLowerCase() === genreKey.toLowerCase()
    ) || 'Drama';

    return genreTagMap[matchedGenre] || genreTagMap['Drama'];
  }

  // Get TMDB-based recommendations when AI is unreliable or unavailable
  static async getTMDBBasedRecommendations(userDescription) {
    try {
      // Normalize the query
      const query = this.normalizeQuery(userDescription || '');
      
      // For simple genre queries, use TMDB discover API
      const genreMap = {
        'horror': 27,
        'comedy': 35,
        'action': 28,
        'drama': 18,
        'romance': 10749,
        'scifi': 878,
        'sci-fi': 878,
        'thriller': 53,
        'war': 10752,
        'mystery': 9648
      };
      
      const queryLower = query.toLowerCase();
      let genreId = null;
      
      // Check if query matches a genre
      for (const [genreName, id] of Object.entries(genreMap)) {
        if (queryLower.includes(genreName) || queryLower === genreName) {
          genreId = id;
          break;
        }
      }
      
      if (genreId) {
        // Use TMDB discover API for genre-based search
        const discoverUrl = `https://api.themoviedb.org/3/discover/movie`;
        const params = {
          api_key: process.env.TMDB_API_KEY,
          with_genres: genreId,
          sort_by: 'popularity.desc',
          language: 'en-US',
          page: 1,
          'vote_average.gte': 6.0 // Only well-rated movies
        };
        
        try {
          const response = await axios.get(discoverUrl, { params });
          if (response.data.results && response.data.results.length > 0) {
            const movies = response.data.results.slice(0, 3).map(movie => {
              const year = movie.release_date ? new Date(movie.release_date).getFullYear() : null;
              return {
                title: movie.title,
                genre: TMDBService.mapGenreIdToName(genreId),
                year: year,
                description: movie.overview || '',
                reason: `A popular ${TMDBService.mapGenreIdToName(genreId).toLowerCase()} film that matches your search.`,
                tagline: null,
                mini_scene: null,
                poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
                tmdb_id: movie.id,
                isFromTMDB: true
              };
            });
            return movies;
          }
        } catch (discoverError) {
          logger.error('TMDB Discover API error', { error: discoverError.message });
        }
      }
      
      // Fallback to regular search
      const tmdbResults = await TMDBService.searchMovies(query, 3);
      if (tmdbResults && tmdbResults.length > 0) {
        return tmdbResults.map(movie => ({
          ...movie,
          reason: `A film matching your search: "${userDescription}".`,
          tagline: null,
          mini_scene: null
        }));
      }
      
      return [];
    } catch (error) {
      logger.error('Error getting TMDB-based recommendations', { error: error.message });
      return [];
    }
  }

  // Validate that recommendations match the user's request
  static async validateCustomRecommendations(recommendations, userDescription) {
    if (!recommendations || recommendations.length === 0) {
      return [];
    }
    
    if (!userDescription || !userDescription.trim()) {
      return recommendations; // If no description, accept all
    }
    
    const descriptionLower = userDescription.toLowerCase().trim();
    const normalizedDescription = this.normalizeQuery(userDescription);
    
    // Extract key terms from description
    const keyTerms = normalizedDescription.split(/\s+/).filter(term => term.length > 3);
    
    // Genre keywords to check
    const genreKeywords = {
      'horror': ['horror', 'scary', 'terror', 'frightening', 'korku'],
      'comedy': ['comedy', 'funny', 'humor', 'komedi'],
      'action': ['action', 'fight', 'explosive', 'combat', 'aksiyon'],
      'romance': ['romance', 'romantic', 'love', 'romcom', 'romantik', 'aşk'],
      'war': ['war', 'military', 'battle', 'savaş', 'askeri'],
      'thriller': ['thriller', 'suspense', 'mystery', 'gerilim'],
      'drama': ['drama', 'dram', 'duygusal'],
      'scifi': ['scifi', 'science fiction', 'space', 'futuristic', 'uzay', 'bilim kurgu']
    };
    
    const validated = [];
    
    for (const movie of recommendations) {
      if (!movie || !movie.title) continue;
      
      // Check if movie matches based on genre
      const movieGenreLower = (movie.genre || '').toLowerCase();
      const movieTitleLower = (movie.title || '').toLowerCase();
      const movieDescriptionLower = (movie.description || '').toLowerCase();
      
      let matches = false;
      
      // Check for genre matches
      for (const [genre, keywords] of Object.entries(genreKeywords)) {
        const hasGenreKeyword = keywords.some(kw => descriptionLower.includes(kw));
        if (hasGenreKeyword) {
          // Check if movie genre matches
          const genreNames = {
            'horror': ['horror', 'thriller'],
            'comedy': ['comedy'],
            'action': ['action', 'adventure'],
            'romance': ['romance'],
            'war': ['war'],
            'thriller': ['thriller', 'mystery'],
            'drama': ['drama'],
            'scifi': ['sci-fi', 'science fiction', 'fantasy']
          };
          
          const validGenres = genreNames[genre] || [genre];
          if (validGenres.some(g => movieGenreLower.includes(g))) {
            matches = true;
            break;
          }
        }
      }
      
      // If no specific genre match, check for general keyword matches
      if (!matches) {
        // Check if key terms appear in title, description, or reason
        const movieText = `${movieTitleLower} ${movieDescriptionLower} ${(movie.reason || '').toLowerCase()}`;
        const matchingTerms = keyTerms.filter(term => movieText.includes(term));
        
        // If at least one key term matches, consider it valid
        if (matchingTerms.length > 0 || keyTerms.length === 0) {
          matches = true;
        }
      }
      
      // Special cases for very specific queries
      if (!matches && descriptionLower.length < 20) {
        // For short queries, be more lenient
        if (keyTerms.length === 0 || keyTerms.some(term => 
          movieTitleLower.includes(term) || 
          movieDescriptionLower.includes(term)
        )) {
          matches = true;
        }
      }
      
      if (matches) {
        validated.push(movie);
      }
    }
    
    return validated;
  }

  // Smart autocomplete with AI suggestions
  static async getAutocompletesuggestions(query) {
    if (!query || query.trim().length < 2) {
      return { movies: [], genres: [], aiSuggestions: [] };
    }

    const cleanQuery = query.trim().toLowerCase();

    // For very short queries, return basic suggestions
    if (cleanQuery.length < 3) {
      return {
        movies: [],
        genres: [],
        aiSuggestions: [
          `${cleanQuery} movies`,
          `${cleanQuery} films`,
          `best ${cleanQuery}`
        ]
      };
    }

    try {
      // Get TMDB movie suggestions
      const tmdbResults = await TMDBService.searchMovies(query, 5);
      const movieSuggestions = tmdbResults.map(movie => ({
        type: 'movie',
        title: movie.title,
        year: movie.year,
        poster: movie.poster_url
      }));

      // Check if query matches common genres
      const commonGenres = ['action', 'comedy', 'drama', 'horror', 'romance', 'sci-fi', 'thriller', 'mystery', 'fantasy', 'animation'];
      const genreSuggestions = commonGenres
        .filter(genre => genre.includes(cleanQuery) || cleanQuery.includes(genre))
        .map(genre => ({ type: 'genre', name: genre }));

      // Generate AI suggestions for more complex queries
      let aiSuggestions = [];
      if (cleanQuery.length >= 4) {
        aiSuggestions = [
          `${cleanQuery} movies`,
          `films like ${cleanQuery}`,
          `${cleanQuery} recommendations`,
          `best ${cleanQuery} films`
        ];
      }

      return {
        movies: movieSuggestions,
        genres: genreSuggestions,
        aiSuggestions: aiSuggestions
      };
    } catch (error) {
      logger.error('Error getting autocomplete suggestions', { error: error.message, query });
      return { movies: [], genres: [], aiSuggestions: [] };
    }
  }

  // Generate spoiler-free summary for a movie
  static async getSpoilerFreeSummary(movieTitle, movieDescription) {
    const prompt = `Generate a spoiler-free summary for the movie "${movieTitle}".

Movie description: "${movieDescription || 'No description available'}"

Requirements:
- Write a brief, engaging summary (2-3 sentences)
- Do NOT reveal any plot twists, endings, or major spoilers
- Focus on the setup, themes, and tone
- Make it intriguing without giving away key moments
- Write in a natural, engaging style

Return ONLY the summary text, no quotes, no extra formatting.`;

    try {
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      } catch (e) {
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        } catch (e2) {
          logger.warn('Gemini API models not available, using fallback summary');
          return this.getFallbackSummary(movieTitle, movieDescription);
        }
      }

      const generationConfig = {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 300
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });

      const response = await result.response;
      let text = response.text().trim();
      
      // Remove quotes if present
      text = text.replace(/^["']|["']$/g, '');
      
      return text || this.getFallbackSummary(movieTitle, movieDescription);
    } catch (error) {
      logger.error('Error generating spoiler-free summary', { error: error.message, movieTitle });
      return this.getFallbackSummary(movieTitle, movieDescription);
    }
  }

  // Fallback summary when AI is not available
  static getFallbackSummary(movieTitle, movieDescription) {
    if (movieDescription && movieDescription.trim().length > 0) {
      // Use first 2-3 sentences of description as fallback
      const sentences = movieDescription.split(/[.!?]+/).filter(s => s.trim().length > 0);
      if (sentences.length > 0) {
        const summary = sentences.slice(0, 2).join('. ').trim();
        if (summary.length > 50) {
          return summary + '.';
        }
      }
    }
    
    // Generic fallback
    return `${movieTitle} is a compelling film that explores themes of human experience through its unique narrative and characters. The story unfolds with engaging storytelling that keeps viewers invested from start to finish.`;
  }

  // Get similar movies to a specific movie
  static async getSimilarMovies(movieTitle, movieDescription, movieGenre) {
    const prompt = `Find 5 movies that are similar to "${movieTitle}" (${movieGenre || 'Unknown genre'}).

Movie Description: "${movieDescription || 'No description available'}"

Requirements:
- Find movies that share similar themes, tone, style, or genre
- Movies should have similar emotional impact or narrative approach
- Include a mix of well-known and lesser-known films
- Provide the EXACT movie title as it appears in TMDB/The Movie Database
- We will fetch all movie details (description, genre, year, poster) from TMDB automatically
- You only need to provide: title, year, reason, tagline, and mini_scene

For each movie, provide:
- "title": Exact Movie Title (as it appears in databases - must be accurate!)
- "year": Release year
- "reason": Why this movie is similar (2-3 sentences, reference specific similarities)
- "tagline": Catchy tagline
- "mini_scene": Vivid scene description (2-3 sentences)

### OUTPUT FORMAT (JSON ONLY - NO MARKDOWN, NO EXPLANATIONS)
Return ONLY a valid JSON array with exactly 5 movies:

[
  {
    "title": "Exact Movie Title (as it appears in TMDB)",
    "year": 2020,
    "reason": "Similar because... (2-3 sentences)",
    "tagline": "Catchy tagline",
    "mini_scene": "Vivid scene description (2-3 sentences)"
  }
]

Return ONLY the JSON array, nothing else.`;

    try {
      let model;
      try {
        model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      } catch (e) {
        try {
          model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        } catch (e2) {
          logger.warn('Gemini API models not available, using fallback recommendations');
          return this.getFallbackRecommendations([movieGenre || 'Drama'], [], []);
        }
      }

      const generationConfig = {
        temperature: 0.8,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 2000,
      };

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: generationConfig,
      });

      const response = await result.response;
      let text = response.text().trim();
      
      // Remove markdown code blocks if present
      text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Parse JSON response
      let recommendations = [];
      try {
        const parsed = JSON.parse(text);
        recommendations = Array.isArray(parsed) ? parsed : (parsed.recommendations || []);
      } catch (parseError) {
        // Try to extract JSON from text
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            recommendations = JSON.parse(jsonMatch[0]);
          } catch (e) {
            logger.error('Failed to parse similar movies JSON', { error: e.message, text });
            return this.getFallbackRecommendations([movieGenre || 'Drama'], [], []);
          }
        } else {
          logger.error('No JSON array found in similar movies response', { text });
          return this.getFallbackRecommendations([movieGenre || 'Drama'], [], []);
        }
      }

      // Validate and format recommendations
      if (!Array.isArray(recommendations) || recommendations.length === 0) {
        logger.warn('No valid recommendations from getSimilarMovies, using fallback');
        return this.getFallbackRecommendations([movieGenre || 'Drama'], [], []);
      }

      // Ensure all required fields are present
      return recommendations.slice(0, 5).map(movie => ({
        title: movie.title || 'Unknown Movie',
        year: movie.year || new Date().getFullYear(),
        reason: movie.reason || `A ${movieGenre || 'movie'} similar to ${movieTitle}.`,
        tagline: movie.tagline || null,
        mini_scene: movie.mini_scene || null
      }));
    } catch (error) {
      logger.error('Error getting similar movies from Gemini', { 
        error: error.message, 
        movieTitle,
        movieGenre 
      });
      // Return fallback recommendations based on genre
      return this.getFallbackRecommendations([movieGenre || 'Drama'], [], []);
    }
  }
}

module.exports = GeminiService;
