const config = {
  clientId: process.env.SOUNDCLOUD_CLIENT_ID,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET
};

(function(global) {
  'use strict';

  var $view = document.getElementById('playlist');
  var player = new SoundCloudAudio();
  var currentToken = null;

  function getStoredToken() {
    const tokenData = localStorage.getItem('sc_token_data');
    if (!tokenData) return null;
    
    try {
      const { token, expiresAt } = JSON.parse(tokenData);
      if (Date.now() >= (expiresAt - 300000)) return null;
      return token;
    } catch (e) {
      return null;
    }
  }

  function storeToken(token, expiresIn) {
    const expiresAt = Date.now() + (expiresIn * 1000);
    localStorage.setItem('sc_token_data', JSON.stringify({
      token,
      expiresAt
    }));
  }

  async function refreshToken(retryCount = 0) {
    const storedToken = getStoredToken();
    if (storedToken) {
      return storedToken;
    }

    const maxRetries = 3;
    const delay = retryCount ? Math.pow(2, retryCount) * 1000 : 0;

    if (delay) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const response = await fetch('https://api.soundcloud.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${config.clientId}&client_secret=${config.clientSecret}`
      });

      if (response.status === 429) {
        if (retryCount < maxRetries) {
          return refreshToken(retryCount + 1);
        } else {
          throw new Error('Max retry attempts reached');
        }
      }

      const data = await response.json();
      if (data.access_token) {
        storeToken(data.access_token, data.expires_in || 3600);
        return data.access_token;
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      throw error;
    }
  }
  
  player._json = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Authorization', 'OAuth ' + currentToken);
    
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status === 401) {
          refreshToken().then(newToken => {
            currentToken = newToken;
            player._json(url, callback);
          });
        } else if (xhr.status === 200) {
          try {
            const data = JSON.parse(xhr.responseText);
            callback(data);
          } catch (err) {
          }
        }
      }
    };

    xhr.send(null);
  };

  function formatDuration(ms) {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
  }

  async function loadPlaylists() {
    try {
      const playlistsContainer = document.createElement('div');
      playlistsContainer.className = 'playlists-container';
      $view.innerHTML = '';
      $view.appendChild(playlistsContainer);
      
      setupGridView(playlistsContainer);
      setupScrollHandler(playlistsContainer);
      
      const response = await fetch('./playlists.json');
      const data = await response.json();
      
      const CHUNK_SIZE = 5;
      const chunks = [];
      
      for (let i = 0; i < data.playlists.length; i += CHUNK_SIZE) {
        chunks.push(data.playlists.slice(i, i + CHUNK_SIZE));
      }
      
      const playlistDivs = data.playlists.map((_, index) => {
        const div = document.createElement('div');
        div.className = 'playlist';
        div.innerHTML = `
          <div class="playlist-card">
            <div class="skeleton-loader"></div>
          </div>
        `;
        playlistsContainer.appendChild(div);
        return div;
      });
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        await Promise.all(chunk.map((playlistUrl, chunkIndex) => {
          const globalIndex = i * CHUNK_SIZE + chunkIndex;
          return new Promise((resolve) => {
            try {
              player.resolve(playlistUrl, function(playlist) {
                const playlistDiv = playlistDivs[globalIndex];
                if (!playlistDiv || !playlistDiv.isConnected) {
                  resolve();
                  return;
                }
                
                const imageUrl = playlist.artwork_url ? 
                  playlist.artwork_url.replace('large', 't500x500') : 
                  'https://placeholder.com/500x500';
                
                playlistDiv.innerHTML = `
                  <div class="playlist-card">
                    <a href="${playlist.permalink_url}" class="playlist-link" target="_blank">
                      <div class="playlist-artwork">
                        <img src="${imageUrl}" alt="${playlist.title}">
                      </div>
                      <div class="playlist-details">
                        <h1 class="playlist-title">${playlist.title}</h1>
                        <div class="playlist-info">by ${playlist.user.username}</div>
                        <div class="playlist-info">${playlist.track_count} tracks · ${formatDuration(playlist.duration)}</div>
                      </div>
                    </a>
                  </div>
                `;
                resolve();
              });
            } catch (e) {
              resolve();
            }
          });
        }));
        
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
    } catch (e) {
      $view.innerHTML = 'Error loading playlists';
    }
  }

  function setupScrollHandler(container) {
    container.addEventListener('wheel', (e) => {
      const isGridView = container.classList.contains('grid-view');
      
      if (!isGridView) {
        e.preventDefault();
        const scrollAmount = e.deltaY * 14;
        const currentScroll = container.scrollLeft;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const newScrollPosition = Math.max(0, Math.min(currentScroll + scrollAmount, maxScroll));
        
        container.scrollTo({
          left: newScrollPosition,
          behavior: 'smooth'
        });
      }
    }, { passive: false });
  }

  function setupDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    const savedPreference = localStorage.getItem('darkMode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedPreference === null && systemPrefersDark) {
      document.body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '☀️ Light Mode';
    } else if (savedPreference === 'true') {
      document.body.classList.add('dark-mode');
      darkModeToggle.innerHTML = '☀️ Light Mode';
    }
    
    darkModeToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDarkMode = document.body.classList.contains('dark-mode');
      darkModeToggle.innerHTML = isDarkMode ? '☀️ Light Mode' : '🌙 Dark Mode';
      
      localStorage.setItem('darkMode', isDarkMode);
    });
  }

  function setupGridView(playlistsContainer) {
    const viewToggle = document.getElementById('viewToggle');
    
    viewToggle.addEventListener('click', () => {
      playlistsContainer.classList.toggle('grid-view');
      const isGridView = playlistsContainer.classList.contains('grid-view');
      viewToggle.innerHTML = isGridView ? '📜 List View' : '📱 Grid View';
      
      localStorage.setItem('gridView', isGridView);
    });
    
    if (localStorage.getItem('gridView') === 'true') {
      playlistsContainer.classList.add('grid-view');
      viewToggle.innerHTML = '📜 List View';
    }
  }

  // Initialize everything
  refreshToken().then(token => {
    currentToken = token;
    loadPlaylists();
  }).catch(() => {
    $view.innerHTML = 'Error loading playlists';
  });

  setupDarkMode();

})(this); 