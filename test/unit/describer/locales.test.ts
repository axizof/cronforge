import { describe as group, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { describe } from '../../../src/describer/describe.js';

const BUILT_IN = ['en', 'fr', 'es', 'de', 'it'] as const;

function loadJson(code: string): Record<string, Record<string, string>> {
  const url = new URL(`../../../src/describer/locales/${code}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, 'utf8')) as Record<string, Record<string, string>>;
}

group('built-in locales', () => {
  const en = loadJson('en');

  it.each(BUILT_IN)('%s defines every atom, month, weekday and macro phrase', (code) => {
    const data = loadJson(code);
    for (const section of ['atoms', 'months', 'weekdays', 'phrases']) {
      expect(Object.keys(data[section] ?? {}).sort()).toEqual(
        Object.keys(en[section] ?? {}).sort(),
      );
    }
  });
});

group('describe() - translations', () => {
  it.each([
    ['fr', '*/15 * * * *', 'Toutes les 15 minutes'],
    ['fr', '* * * 6-8 *', 'Toutes les minutes, de juin à août'],
    ['fr', '0 14 * * *', 'À 14h00, tous les jours'],
    ['fr', '0 12 1 * *', 'À 12h00, le 1er du mois'],
    ['fr', '0 9-17 * * 1-5', 'Toutes les heures, entre 09h00 et 17h59, du lundi au vendredi'],
    ['fr', '0 9 * * MON,WED,FRI', 'À 09h00, le lundi, mercredi et vendredi'],
    ['fr', '@daily', 'Tous les jours, à minuit'],
    ['es', '*/15 * * * *', 'Cada 15 minutos'],
    ['es', '* * * 6-8 *', 'Cada minuto, de junio a agosto'],
    ['es', '0 9 * * MON,WED,FRI', 'A las 09:00, los lunes, miércoles y viernes'],
    ['es', '0 9 1,15 * *', 'A las 09:00, los días 1 y 15 del mes'],
    ['es', '@daily', 'Todos los días, a medianoche'],
    ['de', '*/15 * * * *', 'Alle 15 Minuten'],
    ['de', '* * * 6-8 *', 'Jede Minute, Juni bis August'],
    ['de', '0 9 * * MON,WED,FRI', 'Um 09:00, am Montag, Mittwoch und Freitag'],
    ['de', '0 9 15 * *', 'Um 09:00, am 15. Tag des Monats'],
    ['de', '@daily', 'Jeden Tag um Mitternacht'],
    ['it', '*/15 * * * *', 'Ogni 15 minuti'],
    ['it', '* * * 6-8 *', 'Ogni minuto, da giugno a agosto'],
    ['it', '0 9 * * 1-5', 'Alle 09:00, da lunedì a venerdì'],
    ['it', '0 9 15 * *', 'Alle 09:00, il 15 del mese'],
    ['it', '@daily', 'Ogni giorno a mezzanotte'],
  ])('%s: %s -> %s', (locale, expression, expected) => {
    expect(describe(expression, { mode: 'standard', locale })).toBe(expected);
  });

  it.each([
    ['fr', '0 0 12 ? * MON', 'À 12h00, uniquement le lundi'],
    ['fr', '0 0 12 ? * 2#1', 'À 12h00, le premier lundi du mois'],
    ['es', '0 0 12 L * ?', 'A las 12:00, el último día del mes'],
    ['de', '0 0 12 ? * 6L', 'Um 12:00, am letzten Freitag des Monats'],
    ['it', '0 0 12 LW * ?', "Alle 12:00, l'ultimo giorno lavorativo del mese"],
  ])('%s: quartz %s -> %s', (locale, expression, expected) => {
    expect(describe(expression, { mode: 'quartz', locale })).toBe(expected);
  });
});
