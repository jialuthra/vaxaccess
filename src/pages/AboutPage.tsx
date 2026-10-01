import SourceList from '../components/SourceList.tsx';
import StatsPanel from '../components/StatsPanel.tsx';
import TeamCard from '../components/TeamCard.tsx';
import { siteConfig } from '../config/site.ts';
import { en } from '../content/en.ts';
import { getPhotos, getSources, getTeam, getTeamPhotos, getVideos } from '../services/catalog.ts';

/**
 * About (DESIGN.md §4.2), in order: purpose and users, team, statistics with definitions, data
 * sources, tools, media credits, then repository and Postman links. Member content lives in
 * src/data/team.json.
 */
export default function AboutPage() {
  const strings = en.about;
  return (
    <div className="container py-4 about-page">
      <h1>{strings.heading}</h1>

      <section className="my-4" aria-labelledby="about-purpose">
        <h2 id="about-purpose" className="h4">
          {strings.purposeHeading}
        </h2>
        <p className="lead">{strings.purpose}</p>
        <h3 className="h6">{strings.usersHeading}</h3>
        <ul>
          {strings.users.map((user) => (
            <li key={user}>{user}</li>
          ))}
        </ul>
        <p className="historical-notice p-3">{strings.historicalNote}</p>
      </section>

      <section className="my-5" aria-labelledby="about-team">
        <h2 id="about-team" className="h4">
          {strings.teamHeading}
        </h2>
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {getTeam().map((member) => (
            <div className="col" key={member.username}>
              <TeamCard member={member} />
            </div>
          ))}
        </div>
      </section>

      <section className="my-5" aria-labelledby="about-stats">
        <h2 id="about-stats" className="h4">
          {strings.statsHeading}
        </h2>
        <StatsPanel url={siteConfig.statsUrl} />
        <h3 className="h6 mt-4">{strings.definitionsHeading}</h3>
        <dl className="stats-definitions">
          {strings.definitions.map(({ term, text }) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      <SourceList
        heading={strings.sourcesHeading}
        sourceIds={getSources().map((source) => source.id)}
        showUsage
      />

      <section className="my-5" aria-labelledby="about-tools">
        <h2 id="about-tools" className="h4">
          {strings.toolsHeading}
        </h2>
        <dl className="stats-definitions">
          {strings.tools.map(({ name, use }) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{use}</dd>
            </div>
          ))}
        </dl>
      </section>

      <MediaCredits />

      <section className="my-5" aria-labelledby="about-links">
        <h2 id="about-links" className="h4">
          {strings.linksHeading}
        </h2>
        <ul className="list-unstyled">
          <li>
            {strings.repository}: <a href={siteConfig.repositoryUrl}>{siteConfig.repositoryUrl}</a>
          </li>
          <li>
            {strings.postman}:{' '}
            {siteConfig.postmanUrl ? <a href={siteConfig.postmanUrl}>{siteConfig.postmanUrl}</a> : en.notConfigured}
          </li>
        </ul>
      </section>
    </div>
  );
}

/** Every photo, video, team photo and map credit, as also shown beside each medium. */
function MediaCredits() {
  const strings = en.about;
  return (
    <section className="my-5" aria-labelledby="about-credits">
      <h2 id="about-credits" className="h4">
        {strings.creditsHeading}
      </h2>

      <h3 className="h6">{strings.photosHeading}</h3>
      <ul className="source-list list-unstyled">
        {getPhotos().map((photo) => (
          <li key={photo.id}>
            {photo.caption}
            <span className="source-meta d-block">
              {en.media.photoCredit}: {photo.creator} · {en.media.license}:{' '}
              <a href={photo.licenseUrl}>{photo.licenseName}</a> · <a href={photo.sourcePageUrl}>{en.media.viewFullImage}</a>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="h6 mt-4">{strings.videoHeading}</h3>
      <ul className="source-list list-unstyled">
        {getVideos().map((video) => (
          <li key={video.id}>
            {video.title} ({video.publisher})
            <span className="source-meta d-block">
              <a href={video.watchUrl}>{en.media.watchVideo(video.publisher)}</a>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="h6 mt-4">{strings.teamPhotosHeading}</h3>
      <ul className="source-list list-unstyled">
        {getTeamPhotos().map((photo) => (
          <li key={photo.id}>{photo.credit}</li>
        ))}
      </ul>

      <h3 className="h6 mt-4">{strings.mapsHeading}</h3>
      <ul className="source-list list-unstyled">
        <li>
          {strings.mapCredit}: <a href="https://www.openstreetmap.org/copyright">{en.media.mapAttribution}</a>
        </li>
      </ul>
    </section>
  );
}
