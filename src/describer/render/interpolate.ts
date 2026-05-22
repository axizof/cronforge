/**
 * Replace `{{name}}` placeholders in a template with values from
 * `params`. Unresolved placeholders are left as-is, mirroring `i18next`'s
 * default behaviour. Output is plain text - no HTML escaping is applied
 * because cron descriptions are not rendered as HTML.
 *
 * @example
 * ```ts
 * interpolate('Every {{count}} {{unit}}', { count: '5', unit: 'minutes' });
 * // -> 'Every 5 minutes'
 * ```
 */
export function interpolate(template: string, params: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/gu, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? params[key]! : `{{${key}}}`;
  });
}
