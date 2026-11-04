import type { Section } from './local-workspace.mjs';
export type BusinessField = { key: string; label: string; type: 'tel'|'email'|'text'|'select'|'url'|'number'; required?: boolean; options?: string[] };
export const businessForms: Record<Section, {title:string;detail:string;date:string;fields:BusinessField[]}>;
export function validateExtra(section:string, extra:unknown, options?:{required?:boolean}):string|null;
