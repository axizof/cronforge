import { describe as describeTest, it, expect } from 'vitest';
import { describe } from '../../../src/describer/describe.js';
import { registerLocale } from '../../../src/describer/register.js';
import type { LocaleData } from '../../../src/describer/locales/index.js';

describeTest('registerLocale()', () => {
  it('registers a custom locale, overriding any previous registration', () => {
    const custom: LocaleData = {
      meta: { code: 'pirate', name: 'Pirate', version: '1.0.0', timeFormat: '24h' },
      atoms: {
        every_minute: 'Arrr, every minute',
        every_x_minutes: 'Arrr, every {{count}} minutes',
        every_hour: 'Arrr, every hour',
        every_x_hours: 'Arrr, every {{count}} hours',
        every_second: 'Arrr, every second',
        every_x_seconds: 'Arrr, every {{count}} seconds',
        at_time: 'At {{time}}, arrr',
        every_day: 'every day',
        only_on_weekday: 'on {{weekday}}',
        on_weekdays: 'on {{weekdays}}',
        from_to_weekday: 'from {{from}} to {{to}}',
        on_day_of_month: 'on the {{day}}{{ord}}',
        on_days_of_month: 'on the {{days}}',
        last_day_of_month: 'on the last day',
        last_day_offset: '{{offset}} days before end',
        weekday_nearest_to: 'weekday near {{day}}',
        last_weekday_of_month: 'last {{weekday}}',
        nth_weekday_of_month: '{{nth}} {{weekday}}',
        during_months_range: '{{from}}-{{to}}',
        in_months: 'in {{months}}',
        in_year: 'in {{year}}',
      },
      units: { minute: 'min', minutes: 'mins', hour: 'h', hours: 'h', second: 's', seconds: 's' },
      months: {
        '1': 'Jan', '2': 'Feb', '3': 'Mar', '4': 'Apr', '5': 'May', '6': 'Jun',
        '7': 'Jul', '8': 'Aug', '9': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
      },
      weekdays: {
        '0': 'Sun', '1': 'Mon', '2': 'Tue', '3': 'Wed', '4': 'Thu', '5': 'Fri', '6': 'Sat',
      },
      ordinals: { default: '' },
    };

    registerLocale('pirate', custom);
    const out = describe('* * * * *', { mode: 'standard', locale: 'pirate' });
    expect(out).toContain('Arrr');
  });

  it('does not affect built-in en/fr locales when registering a new code', () => {
    expect(describe('* * * * *', { mode: 'standard', locale: 'en' })).toBe(
      'Every minute, every day',
    );
    expect(describe('* * * * *', { mode: 'standard', locale: 'fr' })).toBe(
      'Toutes les minutes, tous les jours',
    );
  });
});
