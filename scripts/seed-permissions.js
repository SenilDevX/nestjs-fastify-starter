/* eslint-disable no-console */
const { connect, connection, model, Schema } = require('mongoose');
const readline = require('readline');

// ── Enums (mirrored from src/common/enums/permission.enum.ts) ──

const PermissionModule = {
  Users: 'users',
  Roles: 'roles',
  Permissions: 'permissions',
  Todos: 'todos',
};

const PermissionAction = {
  Create: 'create',
  Read: 'read',
  Update: 'update',
  Delete: 'delete',
};

const M = PermissionModule;
const A = PermissionAction;

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

const permissionSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    module: { type: String, required: true },
    action: { type: String, required: true },
    description: { type: String, default: null },
  },
  { timestamps: true, versionKey: false },
);

const Permission = model('Permission', permissionSchema);

// ── Permissions ──

const p = (module, action, description) => ({
  name: `${module}.${action}`,
  module,
  action,
  description,
});

const PERMISSIONS = [
  // Users (admin actions only — self-service endpoints are permission-free)
  p(M.Users, A.Create, 'Create users'),
  p(M.Users, A.Read, 'View users'),
  p(M.Users, A.Update, 'Update users'),
  p(M.Users, A.Delete, 'Delete users'),

  // Roles
  p(M.Roles, A.Create, 'Create roles'),
  p(M.Roles, A.Read, 'View roles'),
  p(M.Roles, A.Update, 'Update roles'),
  p(M.Roles, A.Delete, 'Delete roles'),

  // Permissions
  p(M.Permissions, A.Read, 'View permissions'),

  // Todos
  p(M.Todos, A.Create, 'Create todos'),
  p(M.Todos, A.Read, 'View todos'),
  p(M.Todos, A.Update, 'Update todos'),
  p(M.Todos, A.Delete, 'Delete todos'),
];

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

// ── Seed ──

async function seed() {
  const mongoUri = await prompt('MongoDB connection string: ');
  if (!mongoUri) {
    console.error('No connection string provided. Exiting.');
    process.exit(1);
  }

  await connect(mongoUri);
  console.log('Connected to MongoDB');

  for (const perm of PERMISSIONS) {
    await Permission.updateOne(
      { name: perm.name },
      { $set: perm },
      { upsert: true },
    );
    console.log(`Upserted: ${perm.name}`);
  }

  console.log(`\nSeeded ${PERMISSIONS.length} permissions`);

  // Seed Super Admin role with all permissions
  const allPermissionNames = PERMISSIONS.map((perm) => perm.name);
  await Role.updateOne(
    { name: 'Super Admin' },
    {
      $set: {
        name: 'Super Admin',
        description: 'Full system access — system role, cannot be deleted',
        permissions: allPermissionNames,
        requiresTwoFactor: true,
        isSystem: true,
        isActive: true,
        deletedAt: null,
      },
    },
    { upsert: true },
  );
  console.log('Upserted: Super Admin role');

  await connection.close();
  console.log('\nDone!');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
