require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const SpotifyWebApi = require('spotify-web-api-node');
const { OpenAI } = require('openai');

const openai = new OpenAI(process.env.OPENAI_API_KEY);
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Spotify Web API setup
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

let accessToken = null; // Variable to store the access token

// Redirect to Spotify login
app.get('/login', (req, res) => {
  const scopes = ['user-top-read', 'playlist-modify-private'];
  res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

// Callback route for Spotify to redirect to
app.get('/callback', (req, res) => {
  const error = req.query.error;
  const code = req.query.code;

  if (error) {
    console.error('Callback Error:', error);
    res.send(`Callback Error: ${error}`);
    return;
  }

  spotifyApi.authorizationCodeGrant(code).then(data => {
    accessToken = data.body['access_token']; // Store the access token
    const refresh_token = data.body['refresh_token'];

    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(refresh_token);

    console.log('access_token:', accessToken);
    console.log('refresh_token:', refresh_token);

    // Redirect the user back to the frontend
    res.redirect('https://wills-song-recommender.web.app/'); // Adjust this redirect based on your frontend setup

  }).catch(error => {
    console.error('Error getting Tokens:', error);
    res.send(`Error getting Tokens: ${error}`);
  });
});

// Check if the user is authenticated
app.get('/check_authentication', (req, res) => {
  res.json({ isAuthenticated: !!accessToken });
});

// Generate playlist based on mood
app.post('/generate-playlist', async (req, res) => {
    console.log('*** GENERATING PLAYLIST');
    const { mood } = req.body;

    if (!accessToken) {
        return res.status(403).json({ success: false, message: "User not authenticated" });
    }

    try {
        const data = await spotifyApi.getMyTopTracks();
        let topTracks = data.body.items;
        let trackNames = topTracks.map(track => track.name).join(', ');

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant adept at creating music playlists." },
                { role: "user", content: `Create a playlist based on the mood "${mood}" with songs similar but not the same as: ${trackNames}.` }
            ],
        });

        if (completion.choices && completion.choices.length > 0 && completion.choices[0].message) {
            const playlistSuggestions = completion.choices[0].message.content;
            console.log(playlistSuggestions); // Log the playlist suggestions
            res.json({ success: true, message: "Playlist generated successfully.", playlist: playlistSuggestions });
        } else {
            throw new Error('No playlist suggestions generated');
        }
    } catch (error) {
        console.error('Error generating playlist suggestions:', error);
        res.status(500).json({ success: false, message: "Error generating playlist suggestions" });
    }
});

  

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
