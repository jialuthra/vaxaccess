import { describe, expect, it } from 'vitest';
import { validateTeam } from '../../scripts/lib/dataValidation.ts';
import media from '../../src/data/media.json';
import team from '../../src/data/team.json';
import { getTeam, getTeamPhoto } from '../../src/services/catalog.ts';
import type { TeamMember, TeamPhoto } from '../../src/types/domain.ts';

const allFilesExist = { fileExists: () => true };

/** Validates fresh copies of the committed team data after applying a change. */
function errorsAfter(change: (data: { team: TeamMember[]; teamPhotos: TeamPhoto[] }) => void): string[] {
  const data = structuredClone({ team: team as TeamMember[], teamPhotos: media.teamPhotos as TeamPhoto[] });
  change(data);
  return validateTeam(data.team, data.teamPhotos, allFilesExist);
}

describe('team data', () => {
  it('lists the five roster members in order', () => {
    expect(getTeam().map((member) => member.username)).toEqual([
      'jiakl',
      'atb2923',
      'j.enzosagun',
      'nifemisoyemi',
      'lukeyawn',
    ]);
  });

  it('resolves headshots, and returns undefined for a member without one', () => {
    expect(getTeamPhoto('team-jia')?.localPath).toBe('/images/team/team-jia.jpg');
    expect(getTeamPhoto(null)).toBeUndefined();
    expect(getTeamPhoto('team-unknown')).toBeUndefined();
  });
});

describe('validateTeam', () => {
  it('accepts the committed team data', () => {
    expect(errorsAfter(() => {})).toEqual([]);
  });

  it('rejects an unknown or shared photo ID', () => {
    const errors = errorsAfter(({ team }) => {
      team[1]!.photoId = 'team-nobody';
      team[2]!.photoId = team[0]!.photoId;
    });
    expect(errors).toContain('team/atb2923: unknown team photo "team-nobody"');
    expect(errors).toContain('team: photo "team-jia" is used by more than one member');
  });

  it('requires the permission credit and a file under /images/team/', () => {
    const errors = validateTeam(team as TeamMember[], media.teamPhotos as TeamPhoto[], {
      fileExists: (path) => !path.endsWith('team-enzo.jpg'),
    });
    expect(errors).toEqual(['media/teamPhotos/team-enzo: image file public/images/team/team-enzo.jpg is missing']);
    expect(errorsAfter(({ teamPhotos }) => (teamPhotos[0]!.credit = 'Wikimedia Commons'))).toContain(
      'media/teamPhotos/team-jia: credit must read "Provided by <name>, used with permission"',
    );
  });

  it('rejects empty required fields and duplicate usernames', () => {
    const errors = errorsAfter(({ team }) => {
      team[0]!.bio = '';
      team[1]!.responsibilities = [];
      team[2]!.username = team[3]!.username;
    });
    expect(errors).toContain('team/jiakl: bio must be null or a nonempty string');
    expect(errors).toContain('team/atb2923: responsibilities must be nonempty strings');
    expect(errors).toContain('team: duplicate username "nifemisoyemi"');
  });
});
