// vitest setup — 모든 테스트 이전에 필요한 환경변수를 미리 설정
// (모듈 레벨 Fail Fast 검증이 테스트에서 작동하도록)
process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars-long!!';
process.env.AUTH_PASSWORD_HASH = '$2a$10$placeholder.hash.for.testing.only';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.CRON_SECRET = 'test-cron-secret';
