from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import json
import time

def scrape_soundcloud_playlists():
    # Setup Chrome driver with options
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')  # Run in headless mode
    driver = webdriver.Chrome(options=options)
    
    try:
        # Navigate to the URL
        driver.get('https://soundcloud.com/saxurn/sets')
        
        # Wait for page to load and scroll to load all playlists
        time.sleep(5)  # Initial wait for page load
        
        # Scroll multiple times to load all content
        last_height = driver.execute_script("return document.body.scrollHeight")
        while True:
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)  # Wait for content to load
            new_height = driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height
        
        # Find all playlist links
        playlist_links = driver.find_elements(By.CSS_SELECTOR, '.sc-classic .soundTitle.streamContext .soundTitle__title')
        
        # Create JSON object
        playlists = {
            "playlists": [link.get_attribute('href') for link in playlist_links]
        }
        
        # Save to JSON file
        with open('soundcloud_playlists.json', 'w') as f:
            json.dump(playlists, f, indent=2)
            
        return playlists
        
    finally:
        driver.quit()

if __name__ == "__main__":
    result = scrape_soundcloud_playlists()
    print(f"Found {len(result['playlists'])} playlists")