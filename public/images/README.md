# public/images

Served at `/images/…`. The nine card photos use the file names in DESIGN.md §4.8, which `src/data/media.json` already references:

`site-expo.jpg`, `site-montopolis.jpg`, `site-rundberg.jpg`, `vaccine-influenza.jpg`, `vaccine-covid-19.jpg`, `vaccine-mpox.jpg`, `opportunity-flu.jpg`, `opportunity-mpox.jpg`, `opportunity-covid-19.jpg`

Each was downloaded from the Wikimedia original in `media.json` (`originalUrl`) and resized to 1200 px wide as a quality-80 JPEG, without cropping; `changes`, `width` and `height` record the result.

## Team headshots

`team/` holds headshots provided by each member and used with their permission (`teamPhotos` in `media.json`). They were resized to at most 400 px square (Alex's is the original 192 px) and re-encoded as quality-80 JPEG. `team-placeholder.svg` stands in for a member whose `photoId` is null; it is not a member photo for release.

## Still to do

- Luke's headshot (#42)
