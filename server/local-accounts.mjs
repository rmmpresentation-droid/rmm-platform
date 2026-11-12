// Local demonstration utilities for the legacy Express prototype only.
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";

const demoAccounts = [
  { name: "Admin Démo 1", email: "admin1@example.test", role: "admin" },
  { name: "Admin Démo 2", email: "admin2@example.test", role: "admin" },
  { name: "Admin Démo 3", email: "admin3@example.test", role: "admin" },
  { name: "Présentateur Démo", email: "presentateur1@example.test", role: "presentateur" },
  { name: "Networker Démo 1", email: "networker1@example.test", role: "networker" },
  { name: "Networker Démo 2", email: "networker2@example.test", role: "networker" },
  { name: "Networker Démo 3", email: "networker3@example.test", role: "networker" },
];

export function validateLocalTarget(env) {
  if (env.RMM_LOCAL_ACCOUNT_TOOL !== "1" || env.NODE_ENV === "production")
    throw new Error(
      "Outil réservé au prototype local : activer explicitement RMM_LOCAL_ACCOUNT_TOOL=1 hors production.",
    );
  let url;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    throw new Error("DATABASE_URL locale invalide ou absente.");
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["db", "localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error(
      "Cette commande refuse les bases non locales ; utilisez localhost ou le service Compose db.",
    );
}

export async function resetSuperadmin(pool, email, password, replaceSingle = false) {
  email = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    throw new Error(
      "RMM_ADMIN_EMAIL valide et mot de passe de 12 caractères minimum (72 octets maximum) requis.",
    );
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const admins = (
      await client.query("SELECT id,email FROM users WHERE role='superadmin' ORDER BY email")
    ).rows;
    let target = admins.find((user) => user.email === email);
    if (!target && replaceSingle && admins.length === 1) target = admins[0];
    if (!target)
      throw new Error(
        "Superadmin introuvable pour cet e-mail. Consultez la liste locale ; le changement d’adresse exige --replace-single-superadmin et exactement un superadmin.",
      );
    const collision = (await client.query("SELECT id FROM users WHERE email=$1", [email])).rows[0];
    if (collision && collision.id !== target.id)
      throw new Error("Cette adresse appartient déjà à un autre compte : aucune modification.");
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query("UPDATE users SET email=$1,password_hash=$2 WHERE id=$3", [
      email,
      passwordHash,
      target.id,
    ]);
    // Expire, rather than delete, existing sessions for this account.
    await client.query("UPDATE sessions SET expires_at=NOW() WHERE user_id=$1", [target.id]);
    await client.query("COMMIT");
    return { email, renamed: target.email !== email };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createDemoAccounts(
  pool,
  makePassword = () => randomBytes(18).toString("base64url"),
) {
  const client = await pool.connect();
  const created = [];
  const existing = [];
  try {
    await client.query("BEGIN");
    for (const account of demoAccounts) {
      const match = (
        await client.query("SELECT id,role FROM users WHERE email=$1", [account.email])
      ).rows[0];
      if (match && match.role !== account.role)
        throw new Error(
          `L’adresse de démonstration ${account.email} existe avec un autre rôle : aucune modification effectuée.`,
        );
    }
    for (const account of demoAccounts) {
      const match = (
        await client.query("SELECT id,role FROM users WHERE email=$1", [account.email])
      ).rows[0];
      if (match) {
        existing.push(account);
        continue;
      }
      const password = makePassword();
      if (
        typeof password !== "string" ||
        password.length < 12 ||
        Buffer.byteLength(password, "utf8") > 72
      )
        throw new Error("Mot de passe de démonstration invalide.");
      await client.query(
        "INSERT INTO users (id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5)",
        [randomUUID(), account.email, account.name, account.role, await bcrypt.hash(password, 12)],
      );
      created.push({ ...account, password });
    }
    await client.query("COMMIT");
    return { created, existing };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  validateLocalTarget(process.env);
  const command = process.argv[2];
  if (!["list", "reset-superadmin", "create-demo"].includes(command))
    throw new Error("Commande attendue : list, reset-superadmin ou create-demo.");
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    if (command === "list") {
      const result = await pool.query("SELECT name,email,role FROM users ORDER BY role,email");
      if (!result.rows.length) console.log("Aucun compte dans cette base.");
      for (const user of result.rows) console.log(`${user.role}\t${user.email}\t${user.name}`);
    } else if (command === "reset-superadmin") {
      const result = await resetSuperadmin(
        pool,
        process.env.RMM_ADMIN_EMAIL,
        process.env.RMM_ADMIN_PASSWORD,
        process.argv.includes("--replace-single-superadmin"),
      );
      console.log(
        `Superadmin ${result.email} mis à jour ; anciennes sessions expirées${result.renamed ? " ; adresse modifiée" : ""}.`,
      );
    } else {
      const result = await createDemoAccounts(pool);
      console.log(
        "COMPTES FICTIFS LOCAUX — les mots de passe ne seront affichés que cette fois ; conservez-les en lieu sûr.",
      );
      for (const user of result.created)
        console.log(`${user.role}\t${user.email}\t${user.password}`);
      for (const user of result.existing)
        console.log(
          `${user.role}\t${user.email}\tDéjà existant : mot de passe conservé et non affiché.`,
        );
      console.log("Aucun compte existant n’a été modifié.");
    }
  } finally {
    await pool.end();
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
