// Tests must not depend on the developer's shell having JWT_SECRET set,
// and the auth module now fail-hards when the secret is missing. This
// setup file injects a deterministic, test-only secret BEFORE any
// module under test is imported by jest.
process.env.JWT_SECRET ??=
  'test-jwt-secret-do-not-use-in-prod-32chars-long';
process.env.NODE_ENV ??= 'test';
process.env.CORS_ORIGIN ??= 'http://localhost:3000';
