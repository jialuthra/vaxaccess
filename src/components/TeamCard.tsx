import { en } from '../content/en.ts';
import { getTeamPhoto } from '../services/catalog.ts';
import type { TeamMember } from '../types/domain.ts';

const PLACEHOLDER_PHOTO = '/images/team-placeholder.svg';

/** One member's profile on About. Content comes from src/data/team.json, not this component. */
export default function TeamCard({ member }: { member: TeamMember }) {
  const strings = en.about;
  const photo = getTeamPhoto(member.photoId);
  return (
    <article className="card h-100 team-card">
      <img
        className="team-photo"
        src={photo?.localPath ?? PLACEHOLDER_PHOTO}
        alt={photo?.alt ?? strings.missingPhotoAlt(member.name)}
        width={photo?.width ?? 400}
        height={photo?.height ?? 400}
        loading="lazy"
        decoding="async"
      />
      <div className="card-body">
        <h3 className="h5 card-title mb-1">{member.name}</h3>
        <p className="mb-2">
          <span className="badge team-role">{member.phaseRole}</span>
        </p>
        <p className="source-meta small">
          <a href={`https://gitlab.com/${member.username}`}>{strings.gitlabProfile(member.username)}</a>
        </p>
        <p className="card-text">{member.bio ?? strings.missingBio}</p>
        <h4 className="h6">{strings.responsibilities}</h4>
        <ul className="mb-0">
          {member.responsibilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
