import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Logo } from '@/components/brand/Logo';
import { emptyStore, parseBackup, statuses, type Item, type Section, type Store } from '@/lib/local-workspace.mjs';

type Role = 'Superadministrateur' | 'Administrateur' | 'Présentateur' | 'Networker';
const labels: Record<Section, string> = { prospects: 'Prospects', taches: 'Tâches', rendezvous: 'Rendez-vous', networkers: 'Networkers', formations: 'Formations', ressources: 'Ressources', commandes: 'Commandes', stock: 'Produits et stock' };
const key = 'rmm-local-workspace-v1';
const field = 'w-full rounded-md border border-border bg-background px-3 py-2 text-sm';
const action = 'rounded-md bg-gradient-gold px-4 py-2 text-sm font-semibold text-background';

export function LocalWorkspace({ initialRole = 'Administrateur' }: { initialRole?: Role }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [section, setSection] = useState<Section>('prospects');
  const [data, setData] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [owner, setOwner] = useState('');
  const [date, setDate] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    try { const saved = localStorage.getItem(key); if (saved) setData(parseBackup(saved)); }
    catch { setError('Lecture des données impossible. Exportez ou récupérez le stockage du navigateur avant toute modification.'); return; }
    setReady(true);
  }, []);
  function save(next: Store) {
    try { localStorage.setItem(key, JSON.stringify(next)); setData(next); setError(''); }
    catch { setError('Enregistrement impossible : vérifiez le stockage du navigateur.'); }
  }
  const available: Section[] = role === 'Présentateur' ? ['rendezvous', 'formations', 'ressources'] : role === 'Networker' ? ['prospects', 'taches', 'rendezvous', 'formations', 'ressources', 'networkers'] : Object.keys(labels) as Section[];
  function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const original = data[section].find(item => item.id === editing);
    const item: Item = { id: original?.id ?? crypto.randomUUID(), title: title.trim(), detail: detail.trim(), owner: owner.trim(), date, status: original?.status ?? statuses[section][0] };
    save({ ...data, [section]: original ? data[section].map(entry => entry.id === editing ? item : entry) : [item, ...data[section]] });
    setTitle(''); setDetail(''); setOwner(''); setDate(''); setEditing(null);
  }
  function update(id: string, patch: Partial<Item>) { save({ ...data, [section]: data[section].map(item => item.id === id ? { ...item, ...patch } : item) }); }
  function remove(id: string) { if (window.confirm('Supprimer cet élément local ?')) save({ ...data, [section]: data[section].filter(item => item.id !== id) }); }
  function edit(item: Item) { setEditing(item.id); setTitle(item.title); setDetail(item.detail); setOwner(item.owner); setDate(item.date); }
  function changeSection(s: Section) { setSection(s); setQuery(''); setEditing(null); setTitle(''); setDetail(''); setOwner(''); setDate(''); }
  async function importData(file: File | undefined) {
    if (!file || !window.confirm('Remplacer toutes les données locales par cette sauvegarde ?')) return;
    try { const imported = parseBackup(await file.text()); save(imported); }
    catch { setError('Import refusé : fichier JSON incorrect ou sauvegarde incompatible. Les données existantes sont conservées.'); }
  }
  const list = data[section].filter(item => `${item.title} ${item.detail} ${item.owner} ${item.status}`.toLowerCase().includes(query.toLowerCase()));
  function exportData() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'rmm-donnees-locales.json'; a.click(); URL.revokeObjectURL(url);
  }
  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border px-5 py-4"><div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-4"><Link to="/"><Logo compact /></Link><div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Profil de démonstration</span><select aria-label="Profil de démonstration" value={role} onChange={e => { const r = e.target.value as Role; setRole(r); changeSection(r === 'Présentateur' ? 'rendezvous' : 'prospects'); }} className={field}>{(['Superadministrateur', 'Administrateur', 'Présentateur', 'Networker'] as Role[]).map(r => <option key={r}>{r}</option>)}</select></div></div></header>
    <main className="mx-auto max-w-7xl px-5 py-8">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"><strong>Prototype local uniquement.</strong> Données enregistrées dans ce navigateur, non partagées et non chiffrées. Le choix du rôle n’est pas une authentification : ne saisissez aucune donnée réelle ou sensible. Aucun message Telegram ni paiement n’est envoyé.</div>
      {error && <p role="alert" className="mt-4 text-red-400">{error}</p>}
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.25em] text-[var(--gold)]">RMM · Espace de travail</p><h1 className="mt-2 font-serif text-4xl">{labels[section]}</h1><p className="mt-2 text-sm text-muted-foreground">Gestion locale • {role}</p></div><div className="flex flex-wrap gap-2"><button className="rounded-md border border-border px-4 py-2 text-sm" onClick={exportData}>Exporter JSON</button><label className="cursor-pointer rounded-md border border-border px-4 py-2 text-sm">Importer JSON<input aria-label="Importer une sauvegarde JSON" type="file" accept="application/json,.json" className="sr-only" onChange={e => { void importData(e.target.files?.[0]); e.target.value = ''; }} /></label></div></div>
      <div className="mt-8 flex flex-wrap gap-2">{available.map(s => <button key={s} onClick={() => changeSection(s)} className={`rounded-full px-4 py-2 text-sm ${section === s ? 'bg-gradient-gold text-background' : 'border border-border hover:border-[var(--gold)]'}`}>{labels[s]} <span className="opacity-70">{data[s].length}</span></button>)}</div>
      {section === 'formations' && <div className="mt-6 rounded-lg border border-border p-4 text-sm text-muted-foreground">Days 1, 2 et 3 et quiz : contenu et seuil de réussite à fournir et valider par RMM. Le contrôle d’accès à la formation n’est pas encore implémenté.</div>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
        <form onSubmit={add} className="h-fit rounded-xl bg-card hairline p-6 space-y-4"><h2 className="font-serif text-2xl">{editing ? "Modifier" : "Ajouter"}</h2><label className="block text-sm">Nom / sujet<input required maxLength={160} className={`${field} mt-2`} value={title} onChange={e => setTitle(e.target.value)} /></label><label className="block text-sm">Détails<textarea maxLength={1000} className={`${field} mt-2 min-h-24`} value={detail} onChange={e => setDetail(e.target.value)} /></label><label className="block text-sm">Responsable / destinataire<input className={`${field} mt-2`} value={owner} onChange={e => setOwner(e.target.value)} /></label><label className="block text-sm">Date et heure<input type="datetime-local" className={`${field} mt-2`} value={date} onChange={e => setDate(e.target.value)} /></label><div className="flex gap-3"><button disabled={!ready} className={action}>Enregistrer</button>{editing && <button type="button" onClick={() => changeSection(section)} className="text-sm text-muted-foreground">Annuler</button>}</div></form>
        <section className="rounded-xl bg-card hairline p-6"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="font-serif text-2xl">Liste <span className="text-muted-foreground text-base">({list.length})</span></h2><input aria-label="Rechercher" placeholder="Rechercher…" value={query} onChange={e => setQuery(e.target.value)} className={`${field} max-w-64`} /></div>
          {!ready ? <p className="mt-6 text-sm text-muted-foreground">Chargement…</p> : list.length === 0 ? <p className="mt-6 text-sm text-muted-foreground">Aucun élément. Ajoutez-en un pour commencer.</p> : <div className="mt-5 space-y-3">{list.map(item => <article key={item.id} className="rounded-lg border border-border bg-background p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-medium">{item.title}</h3>{item.detail && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.detail}</p>}<p className="mt-2 text-xs text-muted-foreground">{[item.owner, item.date ? item.date.replace('T', ' ') : ''].filter(Boolean).join(' · ') || 'Sans responsable ni date'}</p></div><div className="flex gap-2"><select aria-label={`Statut de ${item.title}`} className={field} value={item.status} onChange={e => update(item.id, { status: e.target.value })}>{statuses[section].map(s => <option key={s}>{s}</option>)}</select><button className="px-2 text-xs text-[var(--gold)]" onClick={() => edit(item)}>Modifier</button><button className="px-2 text-xs text-red-400" onClick={() => remove(item.id)}>Supprimer</button></div></div></article>)}</div>}
        </section>
      </div>
    </main>
  </div>;
}
