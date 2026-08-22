import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AppDataSource } from '../data-source';
import { User } from '@modules/identity/entities/user.entity';
import { UserRole } from '@modules/identity/enums/user-role.enum';

const BCRYPT_ROUNDS = 12;

/**
 * One-time bootstrap for granting a role (typically super_admin) that can
 * no longer be self-assigned through signup — see AuthService.signup()'s
 * SELF_SERVICE_ROLES filter. Solves the chicken-and-egg problem: a
 * SUPER_ADMIN-gated "promote user" API endpoint (AdminUsersController)
 * needs an existing super admin to call it.
 *
 * Self-gated and safe to leave permanently wired into the start sequence
 * (see package.json's start:prod) — a no-op unless PROMOTE_EMAIL and
 * PROMOTE_ROLES are set as deploy-time env vars, which should be unset
 * again once the promotion has run once.
 *
 * PROMOTE_PASSWORD is optional — when set, it (re)sets the account's
 * password directly. Exists because there's no real email provider wired
 * up yet (ConsoleEmailSender only logs), so "Forgot password" can't
 * actually deliver a reset link to a real inbox yet; this is the practical
 * way to get first-login credentials to a real person until that changes.
 */
async function run() {
  const email = process.env.PROMOTE_EMAIL;
  const rolesRaw = process.env.PROMOTE_ROLES;
  const password = process.env.PROMOTE_PASSWORD;
  if (!email || !rolesRaw) {
    // eslint-disable-next-line no-console
    console.log('[promote-user] PROMOTE_EMAIL/PROMOTE_ROLES not set — skipping.');
    return;
  }

  const requestedRoles = rolesRaw.split(',').map((r) => r.trim()) as UserRole[];
  const invalid = requestedRoles.filter((r) => !Object.values(UserRole).includes(r));
  if (invalid.length) {
    throw new Error(`[promote-user] Unknown role(s) in PROMOTE_ROLES: ${invalid.join(', ')}`);
  }

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  let user = await repo.findOne({ where: { email } });

  if (!user) {
    const passwordToUse = password ?? randomBytes(24).toString('hex');
    user = repo.create({
      email,
      fullName: email.split('@')[0],
      passwordHash: await bcrypt.hash(passwordToUse, BCRYPT_ROUNDS),
      roles: [...new Set([UserRole.RENTER, ...requestedRoles])],
    });
    await repo.save(user);
    // eslint-disable-next-line no-console
    console.log(
      `[promote-user] Created ${email} with roles [${user.roles.join(', ')}].` +
        (password ? '' : ' No usable password was set — use "Forgot password" on the site to set one.'),
    );
  } else {
    user.roles = [...new Set([...user.roles, ...requestedRoles])];
    if (password) user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await repo.save(user);
    // eslint-disable-next-line no-console
    console.log(
      `[promote-user] ${email} now has roles [${user.roles.join(', ')}]${password ? ' and a new password was set' : ''}.`,
    );
  }

  await AppDataSource.destroy();
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[promote-user] failed:', err);
  process.exit(1);
});
