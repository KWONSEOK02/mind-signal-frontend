/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-db-in-features',
      comment: 'Feature code must not import DB drivers directly',
      severity: 'error',
      from: { path: '^src/05-features/' },
      to: {
        path: ['prisma', '@prisma/client', 'drizzle-orm', 'pg', 'mysql2'],
      },
    },
    {
      name: 'no-db-in-pages',
      comment: 'Page code must not import DB drivers directly',
      severity: 'error',
      from: { path: '^src/03-pages/' },
      to: {
        path: ['prisma', '@prisma/client', 'drizzle-orm', 'pg', 'mysql2'],
      },
    },
    {
      name: 'no-upward-from-shared',
      comment: 'Shared layer must not import from upper FSD layers',
      severity: 'error',
      from: { path: '^src/07-shared/' },
      to: {
        path: ['^src/05-features/', '^src/04-widgets/', '^src/03-pages/'],
      },
    },
    {
      name: 'no-upward-from-widgets',
      comment: 'Widgets must not import from pages',
      severity: 'error',
      from: { path: '^src/04-widgets/' },
      to: {
        path: ['^src/03-pages/'],
      },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
  },
};
