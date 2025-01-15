const express = require('express');
const axios = require('axios');
const path = require('path');
const url = require('url');

const app = express();
const port = process.env.PORT || 8087;

// Function to extract client ID from SoundCloud's web app
async function getFreshClientId() {
  try {
    const response = await axios.get('https://soundcloud.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const scriptUrlMatch = response.data.match(/https:\/\/[^"]+\/assets\/[^"]+\.js/g);
    if (!scriptUrlMatch) {
      throw new Error('Could not find script URLs');
    }

    // Try each script until we find the client ID
    for (const scriptUrl of scriptUrlMatch) {
      const scriptResponse = await axios.get(scriptUrl);
      const clientIdMatch = scriptResponse.data.match(/client_id:"([^"]+)"/);
      if (clientIdMatch) {
        return clientIdMatch[1];
      }
    }

    throw new Error('Could not find client ID in scripts');
  } catch (error) {
    console.error('Error fetching fresh client ID:', error);
    return null;
  }
}

let cachedClientId = null;
let lastFetchTime = 0;
const CACHE_DURATION = 3600000; // 1 hour

// Middleware to ensure we have a valid client ID
app.use(async (req, res, next) => {
  const now = Date.now();
  if (!cachedClientId || (now - lastFetchTime) > CACHE_DURATION) {
    const freshClientId = await getFreshClientId();
    if (freshClientId) {
      cachedClientId = freshClientId;
      lastFetchTime = now;
      console.log('Got fresh client ID:', cachedClientId);
    }
  }
  next();
});

// Serve static files
app.use(express.static('.'));

// Endpoint to get the current client ID
app.get('/api/client-id', (req, res) => {
  if (cachedClientId) {
    res.json({ clientId: cachedClientId });
  } else {
    res.status(500).json({ error: 'No valid client ID available' });
  }
});

// Proxy endpoint for SoundCloud API requests
app.get('/api/soundcloud/*', async (req, res) => {
  try {
    const apiPath = req.url.replace('/api/soundcloud/', '');
    
    // Always use the cached client ID from our server
    if (!cachedClientId) {
      const freshClientId = await getFreshClientId();
      if (freshClientId) {
        cachedClientId = freshClientId;
        lastFetchTime = Date.now();
      } else {
        return res.status(500).json({ error: 'No valid client ID available' });
      }
    }

    // Parse the URL and ensure client_id is in the query string
    const parsedUrl = new URL(`https://api-v2.soundcloud.com/${apiPath}`);
    parsedUrl.searchParams.set('client_id', cachedClientId);

    console.log('Proxying request to:', parsedUrl.toString());

    const response = await axios.get(parsedUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // If we get a 401 or 403, try refreshing the client ID
    if (error.response?.status === 401 || error.response?.status === 403) {
      const freshClientId = await getFreshClientId();
      if (freshClientId) {
        cachedClientId = freshClientId;
        lastFetchTime = Date.now();
        
        // Retry the request with the new client ID
        try {
          const parsedUrl = new URL(`https://api-v2.soundcloud.com/${apiPath}`);
          parsedUrl.searchParams.set('client_id', cachedClientId);
          
          const response = await axios.get(parsedUrl.toString(), {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          
          return res.json(response.data);
        } catch (retryError) {
          console.error('Retry failed:', retryError.message);
        }
      }
    }
    
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || {}
    });
  }
});

// Handle all other routes by serving index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 