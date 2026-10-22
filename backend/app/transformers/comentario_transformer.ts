import { BaseTransformer } from '@adonisjs/core/transformers'
import type Comentario from '#models/comentario'

/**
 * Mantiene la forma de la fila cruda que devolvía la ruta legacy: claves en snake_case y
 * `creado_en` como texto 'yyyy-MM-dd HH:mm:ss'. El correo de quien comenta sigue saliendo
 * (hallazgo H11); quitarlo cambia el contrato y es una tarea aparte.
 */
export default class ComentarioTransformer extends BaseTransformer<Comentario> {
  toObject() {
    return {
      id: this.resource.id,
      post_id: this.resource.postId,
      autor_nombre: this.resource.autorNombre,
      autor_email: this.resource.autorEmail,
      cuerpo: this.resource.cuerpo,
      estado: this.resource.estado,
      creado_en: this.resource.creadoEn?.toFormat('yyyy-MM-dd HH:mm:ss') ?? null,
      padre_id: this.resource.padreId,
    }
  }

  toBorrado() {
    return { borrado: true }
  }
}
