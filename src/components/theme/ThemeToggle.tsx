import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
  const [light, setLight] = useState(false);
  useEffect(() => { const value = localStorage.getItem('rmm-theme') === 'light'; setLight(value); document.documentElement.classList.toggle('light', value); }, []);
  function toggle() { const next = !light; setLight(next); document.documentElement.classList.toggle('light', next); localStorage.setItem('rmm-theme', next ? 'light' : 'dark'); }
  return <button type="button" onClick={toggle} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs" aria-label={light ? 'Activer le mode sombre' : 'Activer le mode clair'}>{light ? <Moon size={15} /> : <Sun size={15} />}{light ? 'Sombre' : 'Clair'}</button>;
}
