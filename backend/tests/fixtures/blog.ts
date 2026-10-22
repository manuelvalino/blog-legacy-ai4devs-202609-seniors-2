/**
 * Filas de prueba para los tests funcionales del blog. Usan ids altos para no chocar con
 * la semilla, que sigue cargada debajo de la transacción global de cada test.
 */

export function unPostPublicado(cambios: Record<string, unknown> = {}) {
  return {
    id: 9001,
    titulo: 'Post de prueba',
    slug: 'post-de-prueba',
    resumen: 'Resumen de prueba',
    cuerpo: '## Cuerpo de prueba',
    imagen_portada: null,
    estado: 'publicado',
    publicado_en: '2026-01-01 10:00:00',
    autor_id: 1,
    categoria_id: 1,
    autor_nombre: 'Marta Ruiz Calvo',
    autor_email: 'marta.ruiz@corriente.es',
    categoria_nombre: 'Noticias',
    etiquetas: 'Artículos',
    created_at: '2026-01-01 10:00:00',
    updated_at: '2026-01-01 10:00:00',
    ...cambios,
  }
}

export function unComentario(cambios: Record<string, unknown> = {}) {
  return {
    id: 9101,
    post_id: 9001,
    autor_nombre: 'Lucía Ferrer',
    autor_email: 'lucia.ferrer@ejemplo.es',
    cuerpo: 'Un comentario ya guardado.',
    estado: 'pendiente',
    creado_en: '2026-01-02 09:30:00',
    padre_id: null,
    ...cambios,
  }
}

/** Las ocho columnas de `comentarios`, que hoy salen tal cual en las respuestas. */
export const CAMPOS_COMENTARIO = [
  'autor_email',
  'autor_nombre',
  'creado_en',
  'cuerpo',
  'estado',
  'id',
  'padre_id',
  'post_id',
]

export const FORMATO_CREADO_EN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/

/** La clave que hoy da poder de moderación (hallazgo H3: está escrita en el código). */
export const CLAVE_MODERACION = 'dev-secret-cambiar'
