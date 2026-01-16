import * as THREE from 'three';

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

// Function to get a fresh client ID from our server
async function getFreshClientId() {
  try {
    const response = await fetch('/api/client-id');
    const data = await response.json();
    if (data.clientId) {
      return data.clientId;
    }
    return null;
  } catch (error) {
    console.error('Error getting fresh client ID:', error);
    return null;
  }
}

// Initialize the app with a valid client ID
async function initializeApp() {
  // Get initial client ID either from config or server
  let clientId = window.APP_CONFIG?.clientId;
  if (!clientId) {
    clientId = await getFreshClientId();
  }

  if (!clientId) {
    console.error('Failed to get a valid client ID');
    return;
  }

  const config = { clientId };
  
  (function(global) {
    'use strict';

    var player = new SoundCloudAudio(config.clientId);

    player._json = async function(url, callback) {
      // Extract the original SoundCloud URL if this is an API URL
      let originalUrl = url;
      if (url.includes('api.soundcloud.com/resolve')) {
        const urlParam = new URL(url).searchParams.get('url');
        if (urlParam) {
          originalUrl = decodeURIComponent(urlParam);
        }
      }

      // Convert playlist URL to API V2 format
      const playlistMatch = originalUrl.match(/soundcloud\.com\/([^\/]+)\/sets\/([^\/]+)/);
      if (!playlistMatch) {
        console.error('Invalid playlist URL format:', originalUrl);
        callback(null);
        return;
      }

      // Use our proxy endpoint
      const apiUrl = `/api/soundcloud/resolve?url=${encodeURIComponent(originalUrl)}&client_id=${config.clientId}`;

      var xhr = new XMLHttpRequest();
      xhr.open('GET', apiUrl);
      xhr.setRequestHeader('Accept', 'application/json');
      
      xhr.onreadystatechange = async function() {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              if (!data || (data.kind !== 'playlist' && !data.tracks)) {
                console.error('Invalid response type:', data?.kind);
                callback(null);
                return;
              }
              callback(data);
            } catch (err) {
              console.error('JSON parse error:', err);
              callback(null);
            }
          } else {
            if (xhr.responseText) {
              try {
                const errorData = JSON.parse(xhr.responseText);
                console.error('API request failed:', errorData);
                
                // If we get a 401 or 403, try getting a fresh client ID
                if (xhr.status === 401 || xhr.status === 403) {
                  const newClientId = await getFreshClientId();
                  if (newClientId) {
                    config.clientId = newClientId;
                    player.clientId = newClientId;
                    console.log('Got fresh client ID, retrying request...');
                    player._json(url, callback);
                    return;
                  }
                }
              } catch (e) {
                console.error('Raw error response:', xhr.responseText);
              }
            }
            callback(null);
          }
        }
      };

      xhr.send(null);
    };

    function formatDuration(ms) {
      // Convert to seconds first
      const totalSeconds = Math.floor(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
    }

    async function loadPlaylists(year = '2024') {
      try {
        // Clear existing playlists
        const existingContainer = document.getElementById('playlist');
        if (existingContainer) {
          existingContainer.remove();
        }

        const playlistsContainer = document.createElement('ul');
        playlistsContainer.className = 'playlists-container';
        playlistsContainer.id = 'playlist';
        document.querySelector('.container').appendChild(playlistsContainer);
        
        setupGridView(playlistsContainer);
        setupScrollHandler(playlistsContainer);
        setupTextVisibility(playlistsContainer);
        
        const response = await fetch('./playlists.json');
        const data = await response.json();
        
        // Get playlists for the selected year
        const yearPlaylists = data.years[year] || [];
        
        // Update playlist count text
        const countSpan = document.querySelector('.year-title .count');
        if (!countSpan) {
          console.error('Count span not found');
          return;
        }
        
        // Get current year
        const now = new Date();
        const currentYearNum = now.getFullYear();
        const selectedYearNum = parseInt(year);
        
        // For completed years (before current year), show 52 weeks
        if (selectedYearNum < currentYearNum) {
          countSpan.textContent = '52 weeks, 52 playlists';
        } else if (selectedYearNum === currentYearNum) {
          // For current year, calculate current week number dynamically
          const startOfYear = new Date(`${year}-01-01`);
          const msInWeek = 1000 * 60 * 60 * 24 * 7;
          const currentWeek = Math.ceil((now - startOfYear) / msInWeek);
          countSpan.textContent = `${currentWeek} weeks, ${yearPlaylists.length} playlists`;
        } else {
          // For future years, just show playlist count
          countSpan.textContent = `${yearPlaylists.length} playlists`;
        }
        
        const CHUNK_SIZE = 5;
        const chunks = [];
        
        for (let i = 0; i < yearPlaylists.length; i += CHUNK_SIZE) {
          chunks.push(yearPlaylists.slice(i, i + CHUNK_SIZE));
        }
        
        const playlistDivs = yearPlaylists.map((_, index) => {
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
        
        let loadedCount = 0;
        const totalPlaylists = yearPlaylists.length;
        
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
                  
                  if (!playlist) {
                    console.error('Failed to load playlist:', playlistUrl);
                    playlistDiv.innerHTML = `
                      <article class="playlist-wrapper">
                        <div class="playlist-card error">
                          <div class="error-content">
                            <p>Failed to load playlist</p>
                            <a href="${playlistUrl}" target="_blank" class="error-link">View on SoundCloud</a>
                          </div>
                        </div>
                      </article>
                    `;
                    resolve();
                    return;
                  }
                  
                  // Handle V2 API response format
                  const imageUrl = playlist.artwork_url ? 
                    playlist.artwork_url.replace('-large', '-t500x500') : 
                    'https://placeholder.com/500x500';
                  
                  // Use the playlist's total duration instead of summing tracks
                  const duration = playlist.duration;
                  
                  const trackCount = playlist.tracks ? playlist.tracks.length : playlist.track_count;
                  
                  playlistDiv.innerHTML = `
                    <article class="playlist-wrapper">
                      <div class="playlist-card">
                        <a href="${playlist.permalink_url || playlistUrl}" class="playlist-link" target="_blank" aria-labelledby="playlist-title-${globalIndex}">
                          <div class="playlist-artwork">
                            <img src="${imageUrl}" alt="${playlist.title}" onerror="this.src='https://placeholder.com/500x500'">
                          </div>
                          <div class="playlist-details">
                            <h2 class="playlist-title" id="playlist-title-${globalIndex}">${playlist.title}</h2>
                            <p class="playlist-info">by ${playlist.user ? playlist.user.username : 'Unknown Artist'}</p>
                            <p class="playlist-info">${trackCount} tracks · ${formatDuration(duration)}</p>
                          </div>
                        </a>
                      </div>
                    </article>
                  `;
                  
                  loadedCount++;
                  if (loadedCount === totalPlaylists) {
                    console.log('All playlists loaded successfully');
                    setupTiltEffect(playlistsContainer);
                  }
                  
                  resolve();
                });
              } catch (e) {
                console.error('Error loading playlist:', e);
                const playlistDiv = playlistDivs[globalIndex];
                if (playlistDiv && playlistDiv.isConnected) {
                  playlistDiv.innerHTML = `
                    <article class="playlist-wrapper">
                      <div class="playlist-card error">
                        <p>Failed to load playlist</p>
                      </div>
                    </article>
                  `;
                }
                resolve();
              }
            });
          }));
          
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
      } catch (e) {
        console.error('Error loading playlists:', e);
        const container = document.querySelector('.container');
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error loading playlists';
        container.appendChild(errorMessage);
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
        viewToggle.textContent = isGridView ? '📜' : '📱';
        
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
        viewToggle.textContent = '📜';
      } else {
        viewToggle.textContent = '📱';
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
          // In grid mode, only hide when the playlist significantly overlaps with text
          const overlapThreshold = textRect.height * 0.5; // 50% overlap threshold
          const overlap = Math.min(textRect.bottom - playlistRect.top, textRect.height);
          const isHidden = overlap > overlapThreshold;
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
      window.addEventListener('scroll', () => {
        requestAnimationFrame(updateTextVisibility);
      });
      
      // Update on view mode change
      document.getElementById('viewToggle').addEventListener('click', () => {
        setTimeout(updateTextVisibility, 100);
      });
      
      // Initial check
      setTimeout(updateTextVisibility, 100);
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

    // Add year selection handling
    function setupYearSelection() {
      const yearTitle = document.getElementById('yearTitle');
      const yearSpan = yearTitle.querySelector('.year');
      const countSpan = yearTitle.querySelector('.count');

      if (!yearTitle) {
        console.error('Year title element not found');
        return;
      }

      let currentYear = '2026'; // Start with 2026 (current year)

      // Get available years from playlists.json
      const getAvailableYears = async () => {
        const response = await fetch('./playlists.json');
        const data = await response.json();
        return Object.keys(data.years).sort();
      };

      // Update title and text when year changes
      const updateYearDisplay = async (selectedYear) => {
        yearSpan.textContent = `2☯${selectedYear.slice(2)}`;
        const response = await fetch('./playlists.json');
        const data = await response.json();
        const count = data.years[selectedYear].length;
        
        // Get current year
        const now = new Date();
        const currentYearNum = now.getFullYear();
        const selectedYearNum = parseInt(selectedYear);
        
        // For completed years (before current year), show 52 weeks
        if (selectedYearNum < currentYearNum) {
          countSpan.textContent = '52 weeks, 52 playlists';
        } else if (selectedYearNum === currentYearNum) {
          // For current year, calculate current week number dynamically
          const startOfYear = new Date(`${selectedYear}-01-01`);
          const msInWeek = 1000 * 60 * 60 * 24 * 7;
          const currentWeek = Math.ceil((now - startOfYear) / msInWeek);
          countSpan.textContent = `${currentWeek} weeks, ${count} playlists`;
        } else {
          // For future years, just show playlist count
          countSpan.textContent = `${count} playlists`;
        }
      };

      yearTitle.addEventListener('click', async () => {
        // Cycle through available years
        const availableYears = await getAvailableYears();
        const currentIndex = availableYears.indexOf(currentYear);
        const nextIndex = (currentIndex + 1) % availableYears.length;
        currentYear = availableYears[nextIndex];
        await updateYearDisplay(currentYear);
        loadPlaylists(currentYear);
      });

      // Set initial year display and load playlists
      (async () => {
        await updateYearDisplay(currentYear);
        loadPlaylists(currentYear);
      })();
    }

    function setupTiltEffect(container) {
      // Only apply effects on desktop
      const isDesktop = window.matchMedia('(min-width: 768px)').matches;
      if (!isDesktop) return;

      const cards = container.querySelectorAll('.playlist');
      
      // Recalculate bounds on scroll/resize
      const recalculateBounds = () => {
        cards.forEach(card => {
          const wrapper = card.querySelector('.playlist-wrapper');
          if (wrapper && wrapper.dataset.isHovering === 'true') {
            wrapper.dataset.bounds = JSON.stringify(wrapper.getBoundingClientRect());
          }
        });
      };
      
      let rafId = null;
      window.addEventListener('scroll', recalculateBounds, { passive: true });
      window.addEventListener('resize', recalculateBounds, { passive: true });
      
      cards.forEach(card => {
        const wrapper = card.querySelector('.playlist-wrapper');
        if (!wrapper) return;
        
        let bounds = null;
        let isHovering = false;
        
        const rotateToMouse = (e) => {
          if (!isHovering) return;
          
          // Cancel any pending animation frame
          if (rafId) {
            cancelAnimationFrame(rafId);
          }
          
          rafId = requestAnimationFrame(() => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            // Recalculate bounds if needed
            if (!bounds) {
              bounds = wrapper.getBoundingClientRect();
            }
            
            // Validate bounds
            if (!bounds || bounds.width === 0 || bounds.height === 0) {
              return;
            }
            
            const leftX = mouseX - bounds.x;
            const topY = mouseY - bounds.y;
            const center = {
              x: leftX - bounds.width / 2,
              y: topY - bounds.height / 2
            };
            
            // Calculate distance with minimum value to avoid Math.log issues
            const distance = Math.max(1, Math.sqrt(center.x**2 + center.y**2));
            
            // Clamp rotation values to prevent extreme tilts
            const maxRotation = 15; // degrees
            const rotationAmount = Math.min(maxRotation, Math.log(distance) * 2);
            
            // Calculate rotation axes with clamping
            const rotateX = Math.max(-1, Math.min(1, center.y / 200));
            const rotateY = Math.max(-1, Math.min(1, -center.x / 200));
            
            // Only apply transform if values are valid
            if (isFinite(rotationAmount) && isFinite(rotateX) && isFinite(rotateY)) {
              wrapper.style.transform = `
                perspective(1000px)
                scale3d(1.03, 1.03, 1.03)
                rotate3d(${rotateX}, ${rotateY}, 0, ${rotationAmount}deg)
              `;
            }
          });
        };
        
        const resetStyles = () => {
          if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          
          isHovering = false;
          wrapper.dataset.isHovering = 'false';
          wrapper.style.transform = `
            perspective(1000px)
            scale3d(1, 1, 1)
            rotate3d(0, 0, 0, 0deg)
          `;
          bounds = null;
        };
        
        wrapper.addEventListener('mouseenter', () => {
          isHovering = true;
          wrapper.dataset.isHovering = 'true';
          bounds = wrapper.getBoundingClientRect();
        });
        
        wrapper.addEventListener('mousemove', rotateToMouse);
        wrapper.addEventListener('mouseleave', resetStyles);
      });
    }

    // Initialize the app
    setupThemeToggle();
    setupYearSelection();

    // Wait for playlists to load before setting up lights
    const observer = new MutationObserver((mutations, obs) => {
      const playlistImages = document.querySelectorAll('.playlist-artwork img');
      if (playlistImages.length > 0) {
        obs.disconnect();
        const container = document.querySelector('.container');
        setupPointLights(container);
        setupTiltEffect(document.getElementById('playlist')); // Add tilt effect after playlists load
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

  })(this);
}

// Start the app
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
}); 