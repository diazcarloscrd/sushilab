import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

describe('Admin Authentication Matching', () => {
  const storedUser = {
    id: 'usr_admin_001',
    email: 'yankunsushilab!',
    name: 'YanKunSushiLab!',
    passwordHash: '$2a$10$zGNjTViqUdAXIjRjKArLBulEypDBqDzXBkoNRyyhhBY1yutdewFQa',
    role: 'SUPERADMIN',
    active: true,
  };

  const users = [storedUser];

  function matchUser(input: string) {
    const cleanEmail = input.trim().toLowerCase();
    const cleanInputNoBang = cleanEmail.replace(/!+$/, '');

    return users.find((u) => {
      const uEmail = (u.email || '').toLowerCase();
      const uName = (u.name || '').toLowerCase();
      const uEmailNoBang = uEmail.replace(/!+$/, '');
      const uNameNoBang = uName.replace(/!+$/, '');

      return (
        uEmail === cleanEmail ||
        uName === cleanEmail ||
        uEmailNoBang === cleanInputNoBang ||
        uNameNoBang === cleanInputNoBang ||
        (cleanEmail === 'admin' && (u.role === 'SUPERADMIN' || u.role === 'ADMIN_LOCAL'))
      );
    });
  }

  it('matches YanKunSushiLab! case-insensitively with or without exclamation mark', () => {
    expect(matchUser('YanKunSushiLab!')?.id).toBe('usr_admin_001');
    expect(matchUser('yankunsushilab!')?.id).toBe('usr_admin_001');
    expect(matchUser('yankunsushilab')?.id).toBe('usr_admin_001');
    expect(matchUser('YANKUNSUSHILAB!')?.id).toBe('usr_admin_001');
    expect(matchUser('admin')?.id).toBe('usr_admin_001');
  });

  it('verifies the password $Yankun_Sushilab correctly against the stored bcrypt hash', () => {
    const user = matchUser('YanKunSushiLab!');
    expect(user).toBeDefined();
    const isValid = bcrypt.compareSync('$Yankun_Sushilab', user!.passwordHash);
    expect(isValid).toBe(true);
  });

  it('rejects wrong password', () => {
    const user = matchUser('YanKunSushiLab!');
    const isValid = bcrypt.compareSync('wrongPassword', user!.passwordHash);
    expect(isValid).toBe(false);
  });
});
