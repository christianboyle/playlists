import * as THREE from 'three';

const config = {
  clientId: window.APP_CONFIG.clientId,
  clientSecret: window.APP_CONFIG.clientSecret
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

      const data = await response.json();

      if (response.status === 429) {
        if (retryCount < maxRetries) {
          return refreshToken(retryCount + 1);
        } else {
          throw new Error('Max retry attempts reached');
        }
      }

      if (data.access_token) {
        storeToken(data.access_token, data.expires_in || 3600);
        return data.access_token;
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
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
      const playlistsContainer = document.createElement('ul');
      playlistsContainer.className = 'playlists-container';
      $view.innerHTML = '';
      $view.appendChild(playlistsContainer);
      
      setupGridView(playlistsContainer);
      setupScrollHandler(playlistsContainer);
      setupTextVisibility(playlistsContainer);
      
      const response = await fetch('./playlists.json');
      const data = await response.json();
      
      const CHUNK_SIZE = 5;
      const chunks = [];
      
      for (let i = 0; i < data.playlists.length; i += CHUNK_SIZE) {
        chunks.push(data.playlists.slice(i, i + CHUNK_SIZE));
      }
      
      const playlistDivs = data.playlists.map((_, index) => {
        const li = document.createElement('li');
        li.className = 'playlist';
        li.innerHTML = `
          <article class="playlist-wrapper">
            <div class="playlist-card">
              <div class="skeleton-loader"></div>
            </div>
          </article>
        `;
        playlistsContainer.appendChild(li);
        return li;
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
                  <article class="playlist-wrapper">
                    <div class="playlist-card">
                      <a href="${playlist.permalink_url}" class="playlist-link" target="_blank" aria-labelledby="playlist-title-${globalIndex}">
                        <div class="playlist-artwork">
                          <img src="${imageUrl}" alt="${playlist.title}">
                        </div>
                        <div class="playlist-details">
                          <h2 class="playlist-title" id="playlist-title-${globalIndex}">${playlist.title}</h2>
                          <p class="playlist-info">by ${playlist.user.username}</p>
                          <p class="playlist-info">${playlist.track_count} tracks · ${formatDuration(playlist.duration)}</p>
                        </div>
                      </a>
                    </div>
                  </article>
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
    // For list view
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

    // For grid view
    document.body.addEventListener('wheel', (e) => {
      const isGridView = container.classList.contains('grid-view');
      if (isGridView) {
        const scrollAmount = e.deltaY * 3;  // Reduced multiplier for smoother vertical scroll
        const currentScroll = window.scrollY;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const newScrollPosition = Math.max(0, Math.min(currentScroll + scrollAmount, maxScroll));
        
        window.scrollTo({
          top: newScrollPosition,
          behavior: 'smooth'
        });
      }
    });
  }

  function setupGridView(playlistsContainer) {
    const viewToggle = document.getElementById('viewToggle');
    
    viewToggle.addEventListener('click', () => {
      const isGridView = !playlistsContainer.classList.contains('grid-view');
      
      // Reset all scroll positions before toggling the class
      if (isGridView) {
        // Reset all possible scroll positions
        window.scrollTo(0, 0);
        document.documentElement.scrollTo(0, 0);
        document.body.scrollTo(0, 0);
        playlistsContainer.scrollTo(0, 0);
      }
      
      // Toggle the class after resetting scroll
      playlistsContainer.classList.toggle('grid-view');
      viewToggle.innerHTML = isGridView ? '📜' : '📱';
      
      localStorage.setItem('gridView', isGridView);
    });
    
    // Handle initial load
    if (localStorage.getItem('gridView') === 'true') {
      // Reset all scroll positions first
      window.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
      playlistsContainer.scrollTo(0, 0);
      
      // Then add the grid view class
      playlistsContainer.classList.add('grid-view');
      viewToggle.innerHTML = '📜';
    } else {
      viewToggle.innerHTML = '📱';
    }
  }

  function setupTextVisibility(playlistsContainer) {
    const textContainer = document.querySelector('.text-container');
    
    function updateTextVisibility() {
      const firstPlaylist = playlistsContainer.querySelector('.playlist');
      if (!firstPlaylist || !textContainer) return;
      
      const textRect = textContainer.getBoundingClientRect();
      const playlistRect = firstPlaylist.getBoundingClientRect();
      const isGridView = playlistsContainer.classList.contains('grid-view');
      
      if (isGridView) {
        // Hide text when first playlist moves above text container's bottom edge
        const isHidden = playlistRect.top < textRect.bottom;
        textContainer.style.opacity = isHidden ? '0' : '1';
      } else {
        const isHidden = textRect.right > playlistRect.left;
        textContainer.style.opacity = isHidden ? '0' : '1';
      }
    }
    
    // For list view horizontal scrolling
    playlistsContainer.addEventListener('scroll', () => {
      requestAnimationFrame(updateTextVisibility);
    });
    
    // For grid view vertical scrolling
    document.body.addEventListener('scroll', () => {
      requestAnimationFrame(updateTextVisibility);
    });
    
    // Update on view mode change
    document.getElementById('viewToggle').addEventListener('click', () => {
      setTimeout(updateTextVisibility, 100);
    });
    
    // Initial check
    setTimeout(updateTextVisibility, 100);
  }

  // Add color sampling function
  function getAverageColor(image) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    
    // Create a new image with crossOrigin set
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = image.src;
    
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(img, 0, 0);
        
        try {
          const data = context.getImageData(0, 0, width, height).data;
          let r = 0, g = 0, b = 0;
          
          for (let i = 0; i < data.length; i += 4) {
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
          }
          
          const count = data.length / 4;
          resolve(new THREE.Color(r/count/255, g/count/255, b/count/255));
        } catch (e) {
          console.error('Error sampling color:', e);
          resolve(new THREE.Color(1, 1, 1)); // fallback to white
        }
      };
      
      img.onerror = () => {
        console.error('Error loading image for color sampling');
        resolve(new THREE.Color(1, 1, 1)); // fallback to white
      };
    });
  }

  function setupPointLights(container) {
    // Create Three.js scene
    const scene = new THREE.Scene();
    const aspect = window.innerWidth / window.innerHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 1, 1000);
    camera.position.z = 200;
    camera.lookAt(scene.position);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Position the canvas absolutely and make it non-interactive
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.pointerEvents = 'none';
    renderer.domElement.style.zIndex = '2';

    container.appendChild(renderer.domElement);

    // Create a plane that covers the entire viewport
    const viewGeometry = new THREE.PlaneGeometry(
      window.innerWidth / 2,  // Scale down for Three.js units
      window.innerHeight / 2
    );
    const viewMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,  // White to show shadows better
      transparent: true,
      opacity: 0.1,     // Slightly visible for testing
      shininess: 0
    });
    const viewMesh = new THREE.Mesh(viewGeometry, viewMaterial);
    viewMesh.position.z = -50;  // Move plane back
    viewMesh.receiveShadow = true;
    scene.add(viewMesh);

    // Add lights
    const lights = [];
    const numLights = 4;
    const spheres = [];  // Track light spheres

    // Define colors from the demo
    const lightColors = [
      0xff0040,  // red/pink
      0x0040ff,  // blue
      0x80ff80,  // green
      0xffaa00   // orange/yellow
    ];

    for (let i = 0; i < numLights; i++) {
      const light = new THREE.PointLight(lightColors[i], 1000);  // Much brighter
      light.castShadow = true;
      light.shadow.bias = -0.0001;
      light.shadow.mapSize.width = 1024;
      light.shadow.mapSize.height = 1024;
      light.shadow.camera.near = 10;
      light.shadow.camera.far = 200;
      light.shadow.radius = 8;  // Softer shadows

      // Position lights in a circle
      const angle = (i / numLights) * Math.PI * 2;
      const radius = 50;  // Larger circle
      light.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0  // Start at same z as camera focus
      );

      // Add a sphere at each light's position
      const sphereGeometry = new THREE.SphereGeometry(0.7, 16, 8);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: lightColors[i]
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.copy(light.position);
      scene.add(sphere);
      spheres.push(sphere);

      lights.push(light);
      scene.add(light);
    }

    let lightsEnabled = localStorage.getItem('lightsEnabled') !== 'false'; // Default to true
    
    function updateLightsVisibility() {
      lights.forEach((light, i) => {
        light.visible = lightsEnabled;
        spheres[i].visible = lightsEnabled;
      });
    }

    function animate() {
      requestAnimationFrame(animate);

      const time = Date.now() * 0.0005;

      // Animate lights
      lights.forEach((light, i) => {
        if (!lightsEnabled) return;
        
        switch(i) {
          case 0:
            light.position.x = Math.sin(time * 0.7) * 50;
            light.position.y = Math.cos(time * 0.5) * 50;
            light.position.z = Math.cos(time * 0.3) * 50;
            break;
          case 1:
            light.position.x = Math.cos(time * 0.3) * 50;
            light.position.y = Math.sin(time * 0.5) * 50;
            light.position.z = Math.sin(time * 0.7) * 50;
            break;
          case 2:
            light.position.x = Math.sin(time * 0.7) * 50;
            light.position.y = Math.cos(time * 0.3) * 50;
            light.position.z = Math.sin(time * 0.5) * 50;
            break;
          case 3:
            light.position.x = Math.sin(time * 0.3) * 50;
            light.position.y = Math.cos(time * 0.7) * 50;
            light.position.z = Math.sin(time * 0.5) * 50;
            break;
        }
        
        // Update sphere positions to match lights
        const sphere = spheres[i];
        if (sphere instanceof THREE.Mesh) {
          sphere.position.copy(light.position);
        }
      });

      renderer.render(scene, camera);
    }

    // Handle window resize
    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      
      // Update view mesh size on resize
      viewMesh.geometry = new THREE.PlaneGeometry(
        window.innerWidth / 2,
        window.innerHeight / 2
      );
    }

    window.addEventListener('resize', onWindowResize);

    // Start animation
    animate();

    // Set initial state
    updateLightsVisibility();
  }

  function setupThemeToggle() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Get stored preference or default to dark mode
    let isDarkMode = localStorage.getItem('darkMode');
    isDarkMode = isDarkMode === null ? true : isDarkMode === 'true';
    
    function updateTheme(dark) {
      if (dark) {
        document.documentElement.classList.add('dark-mode');
        darkModeToggle.innerHTML = '<span>🌞</span>';
      } else {
        document.documentElement.classList.remove('dark-mode');
        darkModeToggle.innerHTML = '<span>🌚</span>';
      }
      localStorage.setItem('darkMode', dark);
    }
    
    // Set initial theme
    updateTheme(isDarkMode);
    
    // Handle toggle button click
    darkModeToggle.addEventListener('click', () => {
      isDarkMode = !isDarkMode;
      updateTheme(isDarkMode);
    });
    
    // Handle system theme changes
    prefersDark.addListener((e) => {
      if (localStorage.getItem('darkMode') === null) {
        updateTheme(e.matches);
      }
    });
  }

  // Initialize everything
  refreshToken().then(token => {
    currentToken = token;
    loadPlaylists();
    
    // Wait for playlists to load before setting up lights
    const observer = new MutationObserver((mutations, obs) => {
      const playlistImages = document.querySelectorAll('.playlist-artwork img');
      if (playlistImages.length > 0) {
        obs.disconnect();
        const container = document.querySelector('.container');
        setupPointLights(container);
        setupThemeToggle();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }).catch(() => {
    $view.innerHTML = 'Error loading playlists';
  });

})(this); 