import { en } from '../content/en.ts';
import type { Photograph, Video } from '../types/domain.ts';

// Captioned media for detail pages (DESIGN.md §4.8). Every embed keeps a caption and an
// external link outside the iframe, so the page stays useful if the embed fails to load.

export type MediaBlockProps =
  | {
      type: 'photo';
      photo: Photograph;
      /** Lazy-load unless the photo is in the first screen of the page. */
      lazy?: boolean;
    }
  | {
      type: 'map';
      /** Place name used in the iframe title and caption. */
      label: string;
      /** Display address; also used for the fallback search link. */
      address: string;
      latitude: number | null;
      longitude: number | null;
      /** Replaces the default caption, e.g. to mark the map as event-location context. */
      caption?: string;
    }
  | { type: 'video'; video: Video };

// Half-width and half-height of the map's bounding box, in degrees: a few blocks around
// the marker at Austin's latitude.
const MAP_LON_SPAN = 0.006;
const MAP_LAT_SPAN = 0.004;

/** OpenStreetMap export/embed URL with a marker and a small surrounding bounding box. */
export function osmEmbedUrl(latitude: number, longitude: number): string {
  const bbox = [longitude - MAP_LON_SPAN, latitude - MAP_LAT_SPAN, longitude + MAP_LON_SPAN, latitude + MAP_LAT_SPAN]
    .map((value) => value.toFixed(6))
    .join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude},${longitude}`;
}

/** Full OpenStreetMap page for the location; falls back to an address search without coordinates. */
export function osmMapUrl(latitude: number | null, longitude: number | null, address: string): string {
  if (latitude === null || longitude === null) {
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(address)}`;
  }
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

function PhotoMedia({ photo, lazy = true }: { photo: Photograph; lazy?: boolean }) {
  return (
    <figure className="media-block">
      <div className="media-frame ratio ratio-4x3">
        <img
          src={photo.localPath}
          alt={photo.alt}
          width={photo.width ?? undefined}
          height={photo.height ?? undefined}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
        />
      </div>
      <figcaption>
        {photo.caption}{' '}
        <span className="d-block">
          {en.media.photoCredit}: {photo.creator} · {en.media.license}: <a href={photo.licenseUrl}>{photo.licenseName}</a> ·{' '}
          <a href={photo.sourcePageUrl}>{en.media.viewFullImage}</a>
        </span>
      </figcaption>
    </figure>
  );
}

function MapMedia({
  label,
  address,
  latitude,
  longitude,
  caption,
}: {
  label: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  caption?: string;
}) {
  const mapUrl = osmMapUrl(latitude, longitude, address);
  // Coordinates may be null only in local development (release validation rejects it);
  // the address and external map link still render.
  return (
    <figure className="media-block">
      {latitude !== null && longitude !== null ? (
        <div className="media-frame ratio ratio-4x3">
          <iframe src={osmEmbedUrl(latitude, longitude)} title={en.media.mapTitle(label)} loading="lazy" />
        </div>
      ) : (
        <p className="media-frame p-3 mb-0">{en.media.mapUnavailable}</p>
      )}
      <figcaption>
        {caption ?? label}
        <span className="d-block">
          <a href="https://www.openstreetmap.org/copyright">{en.media.mapAttribution}</a> ·{' '}
          <a href={mapUrl}>{en.media.openMap}</a>
        </span>
      </figcaption>
    </figure>
  );
}

function VideoMedia({ video }: { video: Video }) {
  return (
    <figure className="media-block">
      <div className="media-frame ratio ratio-16x9">
        {/* No autoplay parameter: videos start only when the visitor chooses. */}
        <iframe
          src={video.embedUrl}
          title={en.media.videoTitle(video.title, video.publisher)}
          loading="lazy"
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <figcaption>
        {video.caption}
        <span className="d-block">
          <a href={video.watchUrl}>{en.media.watchVideo(video.publisher)}</a>
        </span>
      </figcaption>
    </figure>
  );
}

/** A captioned photo, OpenStreetMap embed or YouTube embed. */
export default function MediaBlock(props: MediaBlockProps) {
  switch (props.type) {
    case 'photo':
      return <PhotoMedia photo={props.photo} lazy={props.lazy} />;
    case 'map':
      return (
        <MapMedia
          label={props.label}
          address={props.address}
          latitude={props.latitude}
          longitude={props.longitude}
          caption={props.caption}
        />
      );
    case 'video':
      return <VideoMedia video={props.video} />;
  }
}
