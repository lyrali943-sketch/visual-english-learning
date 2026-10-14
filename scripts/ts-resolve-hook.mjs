/**
 * Minimal ESM resolve hook so plain Node can import the project's TypeScript
 * sources, which use bundler-style extensionless specifiers (`./foo`).
 *
 * Used only by the offline check scripts in this folder. The app itself is
 * built by Vite and never loads this file.
 */

const CANDIDATE_SUFFIXES = ['.ts', '.tsx', '.mts', '/index.ts', '/index.tsx']

export async function resolve(specifier, context, nextResolve) {
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/')
  if (!isRelative) return nextResolve(specifier, context)

  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    for (const suffix of CANDIDATE_SUFFIXES) {
      try {
        return await nextResolve(specifier + suffix, context)
      } catch {
        // keep trying
      }
    }
    throw error
  }
}