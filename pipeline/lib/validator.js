/**
 * Validation JSON Schema via AJV.
 *
 * Chaque schéma est compilé une seule fois et mis en cache.
 */
import Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });
const compiled = new Map();

/**
 * Valide un objet contre un schéma JSON.
 *
 * @param {unknown} data - Données à valider
 * @param {object} schema - Schéma JSON (objet JS, pas un chemin)
 * @returns {{ ok: boolean, errors?: import('ajv').ErrorObject[] }}
 */
export function validate(data, schema) {
  // Compiler le schéma si pas encore en cache (clé = $id ou title)
  const key = schema.$id || schema.title || JSON.stringify(schema).slice(0, 40);
  if (!compiled.has(key)) {
    compiled.set(key, ajv.compile(schema));
  }

  const fn = compiled.get(key);
  const valid = fn(data);

  if (valid) return { ok: true };
  return { ok: false, errors: fn.errors };
}
