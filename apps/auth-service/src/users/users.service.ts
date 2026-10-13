import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async findByEmail(email: string) {
    // Fake database lookup
    if (email !== 'test@example.com') return null;

    // Return a fake user matching your User type, plus a fake password hash
    return {
      id: 1,
      login: 'abnsila',
      first_name: 'Abdellah',
      last_name: 'Nsila',
      gender: true,
      department: 'Engineering',
      phone_number: null,
      email: 'test@example.com',
      avatar: null,
      joined_at: new Date().toISOString(),
      password: 'fake_hashed_password', // This gets stripped out in AuthServiceService
    };
  }

  async verifyPassword(userId: number, passwordString: string) {
    // Fake password verification (only accepts 'my_password123' for testing)
    return passwordString === 'my_password123';
  }
}