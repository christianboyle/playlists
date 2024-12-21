Motivation
========

I'm a big fan of making [playlists](https://soundcloud.com/saxurn/sets) on SoundCloud and made a bunch this year.

Then I saw https://playlists.design and thought it was pretty cool, with the exception of two things:
 - They use [Spotify](https://musictech.com/news/music/spotify-uses-ghost-artists-on-playlists-report-claims/) 🤮
 - My desktop sounds like it's about to achieve liftoff when you start scrolling 🚁

Generate `playlists.json`
========

1. update the username you want to get [here](https://github.com/christianboyle/playlists/blob/main/scrape-playlists.py#L16)
2. `pip install -r requirements.txt`
3. `python scrape-playlists.py`
4. output file is `soundcloud_playlists.json`
5. modify as needed and save as `playlists.json`

Install and Build
========

Prereqs:
 - A [registered](https://developers.soundcloud.com/) SoundCloud app, with API access for `Client ID` and `Client Secret`
 - A host capable of running Docker

1. `git clone git@github.com:christianboyle/playlists.git`
2. `mv .env.example .env`
3. fill in `.env` with `Client ID` and `Client Secret`
4. `docker-compose up --build`
5. should see `app-1  |  INFO  Accepting connections at http://localhost:8087`
5. when done `docker-compose down`

Notes
========

- The SoundCloud API refresh token is cached and rotated as-needed to avoid rate-limiting
- The `.env` values are injected at runtime, when the container starts, to avoid exposing in `bundle.js`

Development
========

Dev: `npm run dev`

Prod: `npm run build`
