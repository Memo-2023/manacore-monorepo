-- Create additional databases for services
-- Note: mana_platform is already created as POSTGRES_DB by Docker

-- Sync database: separate for I/O isolation (write-heavy, append-only)
CREATE DATABASE mana_sync;

-- Infrastructure databases (external tools)
CREATE DATABASE glitchtip;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mana_platform TO mana;
GRANT ALL PRIVILEGES ON DATABASE mana_sync TO mana;
GRANT ALL PRIVILEGES ON DATABASE glitchtip TO mana;
