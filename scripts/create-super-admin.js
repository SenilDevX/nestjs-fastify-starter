/* eslint-disable no-console */
const { connect, connection, model, Schema, Types } = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const SALT_ROUNDS = 12;

// ── Schemas ──

const roleSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    permissions: { type: [String], default: [] },
    requiresTwoFactor: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

const Role = model('Role', roleSchema);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    isTwoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, default: null },
    twoFactorTempSecret: { type: String, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    mustChangePassword: { type: Boolean, default: false },
    mustSetupTwoFactor: { type: Boolean, default: false },
    roleId: { type: Types.ObjectId, ref: 'Role', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

const User = model('User', userSchema);

// ── Helpers ──

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── Main ──

async function main() {
  const mongoUri = await prompt('MongoDB connection string: ');
  if (!mongoUri) {
    console.error('No connection string provided. Exiting.');
    process.exit(1);
  }

  const email = await prompt('Super Admin email: ');
  if (!email) {
    console.error('No email provided. Exiting.');
    process.exit(1);
  }

  const password = await prompt('Super Admin password: ');
  if (!password) {
    console.error('No password provided. Exiting.');
    process.exit(1);
  }

  await connect(mongoUri);
  console.log('Connected to MongoDB');

  // Find the Super Admin system role
  const superAdminRole = await Role.findOne({
    name: 'Super Admin',
    isSystem: true,
  });
  if (!superAdminRole) {
    console.error(
      'Super Admin role not found. Run seed-permissions.js first.',
    );
    await connection.close();
    process.exit(1);
  }

  // Check if user already exists
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`User with email "${email}" already exists.`);
    await connection.close();
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    roleId: superAdminRole._id,
    mustSetupTwoFactor: true,
    mustChangePassword: false,
  });

  console.log(`\nSuper Admin created: ${email}`);
  console.log('2FA setup will be required on first login.');

  await connection.close();
  console.log('Done!');
}

main().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
