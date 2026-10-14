/**
 * Entry point for `node --import ./scripts/register-ts.mjs <script>`.
 * Registers the extensionless-specifier resolve hook and enables TypeScript
 * type stripping so the offline check scripts can import src/ directly.
 */

import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

register('./ts-resolve-hook.mjs', pathToFileURL(import.meta.dirname + '/'))