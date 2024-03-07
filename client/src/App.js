import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CircularProgress, Container, TextField, Button, Box, Typography, List, ListItem } from '@mui/material';
import bgImage from './assets/bg3.png';

function App() {
  const [mood, setMood] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [playlistSuggestions, setPlaylistSuggestions] = useState('');
  const [loading, setLoading] = useState(false); // Add a loading state

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const { data } = await axios.get('https://us-central1-wills-song-recommender.cloudfunctions.net/api/check_authentication');
        setAuthenticated(data.isAuthenticated);

        if (!data.isAuthenticated) {
          window.location.href = 'https://us-central1-wills-song-recommender.cloudfunctions.net/api/login';
        }
      } catch (error) {
        console.error(error);
      }
    };

    checkAuthentication();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Set loading to true when request starts
    try {
      const response = await axios.post('https://us-central1-wills-song-recommender.cloudfunctions.net/api/generate-playlist', { mood });
      setPlaylistSuggestions(response.data.playlist); // Assuming this is a string as described
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false); // Set loading to false when request is complete
    }
  };

  // Function to process the playlistSuggestions and return an array of songs
  const getSongsArray = (playlistString) => {
    const lines = playlistString.split('\n'); // Split by newline
    // Filter out empty lines and non-song lines
    const songs = lines.filter(line => line.match(/^\d+\./));
    return songs;
  };

  return (
    <Box
      sx={{
        background: `url(${bgImage}) no-repeat center`,
        backgroundSize: 'cover',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom>
            Will's Song Recommendations
          </Typography>
          {authenticated ? (
            <>
              <form onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Enter your mood"
                  variant="outlined"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  margin="normal"
                />
                <Button variant="contained" color="primary" type="submit" disabled={loading}>
                  Generate Playlist
                </Button>
              </form>
              {loading ? <CircularProgress /> : ( // Show loading indicator while loading
                playlistSuggestions && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6">Songs for you:</Typography>
                    <List>
                      {getSongsArray(playlistSuggestions).map((song, index) => (
                        <ListItem key={index}>{song}</ListItem>
                      ))}
                    </List>
                  </Box>
                )
              )}
            </>
          ) : (
            <Typography>Please wait...</Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}

export default App;
