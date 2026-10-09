import { Club } from '@app/contracts/club/club.types.js';
import { rpcError } from '@app/contracts/errors.js';
import { Injectable } from '@nestjs/common';


@Injectable()
export class ClubServiceService {
  getAllClubs(): Club[] {
    return [
      {
        id: 1,
        name: 'badminton',
        description: 'Description of badminton club',
        avatar: 'https://example.com/badminton-avatar.jpg',
        created_at: '2023-06-01T12:00:00Z',
      },
      {
        id: 2,
        name: 'padel',
        description: 'Description of padel club',
        avatar: 'https://example.com/padel-avatar.jpg',
        created_at: '2023-06-02T12:00:00Z',
      },
      {
        id: 3,
        name: 'table tennis',
        description: 'Description of table tennis club',
        avatar: 'https://example.com/table-tennis-avatar.jpg',
        created_at: '2023-06-03T12:00:00Z',
      },
      {
        id: 4,
        name: 'squash',
        description: 'Description of squash club',
        avatar: 'https://example.com/squash-avatar.jpg',
        created_at: '2023-06-04T12:00:00Z',
      },
      {
        id: 5,
        name: 'tennis',
        description: 'Description of tennis club',
        avatar: 'https://example.com/tennis-avatar.jpg',
        created_at: '2023-06-05T12:00:00Z',
      },
    ];
  }
  getClubByName(clubName: string): Club | null {
    const clubs = this.getAllClubs();
    const club = clubs.find((c) => c.name === clubName);
    if (!club) {
      console.log(`[ClubService] Club with name "${clubName}" not found`);
      throw rpcError(404, 'Club not found', 'Not Found');
    }
    return club || null;
  }
}
