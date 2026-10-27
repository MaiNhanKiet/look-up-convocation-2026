#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  DATABASE_URL="$(node --input-type=module <<'EOF'
import dns from "node:dns/promises";
import net from "node:net";

const raw = process.env.DATABASE_URL ?? "";
const match = raw.match(/^(postgresql:\/\/[^@]+@)([^:/]+)(:\d+.*)$/);
if (!match) {
  console.error("DATABASE_URL must use postgresql://user:password@host:port/database");
  process.exit(1);
}

const [, prefix, host, suffix] = match;
const port = Number((suffix.match(/^:(\d+)/) ?? [])[1] ?? 5432);
const deadline = Date.now() + 60_000;

function connect(ip) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: ip, port, family: 4 });
    const finish = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(2000);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

let ip = "";
while (Date.now() < deadline) {
  try {
    const addresses = await dns.resolve4(host);
    if (addresses[0] && (await connect(addresses[0]))) {
      ip = addresses[0];
      break;
    }
  } catch {
    // The database container is not ready yet.
  }
  console.error(`Waiting for PostgreSQL at ${host}:${port}`);
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

if (!ip) {
  console.error(`Could not reach PostgreSQL at ${host}:${port}`);
  process.exit(1);
}

process.stdout.write(`${prefix}${ip}${suffix}`);
EOF
)"
  export DATABASE_URL
  node ./node_modules/prisma/build/index.js migrate deploy
fi

exec node server.js
