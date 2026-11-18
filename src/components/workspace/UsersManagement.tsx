import { useState, type FormEvent } from "react";
import { useLanguage } from "@/lib/i18n";

type Role = "superadmin" | "admin" | "presentateur" | "networker";
type Account = { id: string; name: string; email: string; role: Role; is_active: boolean };
const roles: Record<Role, string> = {
  superadmin: "Superadministrateur",
  admin: "Administrateur",
  presentateur: "Présentateur",
  networker: "Networker",
};
const field = "mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
export function UsersManagement({
  accounts,
  actorRole,
  actorId,
  onSaved,
}: {
  accounts: Account[];
  actorRole: Role;
  actorId: string;
  onSaved: () => Promise<void>;
}) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState<Account | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(account: Account) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(account.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: account.name,
          email: account.email,
          role: account.role,
          is_active: account.is_active,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Impossible de modifier le compte.");
      setEditing(null);
      if (account.id === actorId) {
        window.location.reload();
        return;
      }
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de modifier le compte.");
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (editing) void save(editing);
  }
  return (
    <section className="rounded-xl bg-card hairline p-6">
      <h2 className="font-serif text-2xl">
        {t(actorRole === "superadmin" ? "Comptes" : "Présentateurs")}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("La désactivation bloque l’accès sans supprimer l’historique.")}
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-500">
          {error}
        </p>
      )}
      {accounts.map((account) => (
        <div key={account.id} className="border-b border-border py-4 text-sm">
          <strong>{account.name}</strong>
          <p className="text-muted-foreground">
            {account.email} · {t(roles[account.role])} ·{" "}
            {t(account.is_active ? "Actif" : "Désactivé")}
          </p>
          <div className="mt-2 flex flex-wrap gap-3">
            <button
              type="button"
              className="text-[var(--gold)] underline"
              onClick={() => {
                setError("");
                setEditing(account);
              }}
            >
              {t("Modifier")}
            </button>
            {account.role !== "superadmin" && (
              <button
                type="button"
                disabled={busy}
                className="text-[var(--gold)] underline disabled:opacity-50"
                onClick={() => {
                  if (
                    window.confirm(
                      t(
                        account.is_active
                          ? "Désactiver ce compte ? Les données seront conservées."
                          : "Réactiver ce compte ?",
                      ),
                    )
                  )
                    void save({ ...account, is_active: !account.is_active });
                }}
              >
                {t(account.is_active ? "Désactiver" : "Réactiver")}
              </button>
            )}
          </div>
        </div>
      ))}
      {!accounts.length && (
        <p className="mt-4 text-sm text-muted-foreground">{t("Aucun utilisateur.")}</p>
      )}
      {editing && (
        <form onSubmit={submit} className="mt-5 space-y-3 rounded-xl border border-border p-4">
          <h3 className="font-semibold">{t("Modifier le compte")}</h3>
          <label className="block text-sm">
            {t("Nom")}
            <input
              required
              maxLength={100}
              className={field}
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            {t("E-mail")}
            <input
              required
              type="email"
              maxLength={254}
              className={field}
              value={editing.email}
              onChange={(e) => setEditing({ ...editing, email: e.target.value })}
            />
          </label>
          <label className="block text-sm">
            {t("Rôle")}
            <select
              className={field}
              value={editing.role}
              disabled={actorRole !== "superadmin" || editing.role === "superadmin"}
              onChange={(e) => setEditing({ ...editing, role: e.target.value as Role })}
            >
              {Object.entries(roles).map(([key, label]) => (
                <option key={key} value={key}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            {t("Toute modification déconnecte le compte concerné.")}
          </p>
          <div className="flex gap-4">
            <button
              disabled={busy}
              className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {t("Enregistrer")}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setError("");
              }}
            >
              {t("Annuler")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
