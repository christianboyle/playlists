Motivation
========

I'm a big fan of making [playlists](https://soundcloud.com/saxurn/sets) on SoundCloud and made a bunch this year.

Then I saw https://playlists.design and thought it was pretty cool, with the exception of two things:
 - They use Spotify 🤮
 - My desktop sounds like it's about to achieve liftoff when you start scrolling 🚁

Install
========

Prereqs:
 - A [registered](https://developers.soundcloud.com/) SoundCloud app, with API access for `Client ID` and `Client Secret`
 - A host capable of running Docker

1. `git clone git@github.com:christianboyle/playlists.git`
2. `mv .env.example .env`
3. fill in `.env` with `Client ID` and `Client Secret`
4. `docker-compose up --build`

Notes
========

1. The refresh token is cached and rotated as-needed to avoid rate-limiting
2. The .env values are injected at runtime, when the container starts, to avoid exposing in `bundle.js`

Development
========

dev: `npm run dev`
prod: `npm run build`
