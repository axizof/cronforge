/** Replace `{{name}}` tokens with values from `params`. Unresolved tokens
 *  are left as-is (i18next behaviour). Plain-text output — no HTML escaping. */
export function interpolate(template: string, params: Readonly<Record<string, string>>): string {
  return template.replace(/\{\{(\w+)\}\}/gu, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(params, key) ? params[key]! : `{{${key}}}`;
  });
}
