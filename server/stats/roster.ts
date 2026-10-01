// The fixed Phase I roster (DESIGN.md §4.9). Usernames are resolved to GitLab user IDs at runtime.

export interface RosterMember {
  name: string;
  username: string;
}

export const ROSTER: readonly RosterMember[] = [
  { name: 'Jia Luthra', username: 'jiakl' },
  { name: 'Alex Bui', username: 'atb2923' },
  { name: 'Enzo Sagun', username: 'j.enzosagun' },
  { name: 'Nifemi Soyemi', username: 'nifemisoyemi' },
  { name: 'Luke Yan', username: 'lukeyawn' },
];
