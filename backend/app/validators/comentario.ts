import vine, { SimpleErrorReporter } from '@vinejs/vine'
import type { SimpleError } from '@vinejs/vine/types'
import ComentarioInvalidoException from '#exceptions/comentario_invalido_exception'

type RespuestaDeError = { status: number; cuerpo: Record<string, unknown> }

/**
 * Convierte el primer error en la respuesta que daba la ruta legacy, que tiene un código
 * y una forma distintos para cada caso (hallazgo H9). Los campos se validan en el orden
 * del esquema, así que el primer error es el que la ruta legacy comprobaba antes.
 */
class ReporteroDeComentario extends SimpleErrorReporter {
  constructor(private traducir: (error: SimpleError) => RespuestaDeError) {
    super()
  }

  createError() {
    const { status, cuerpo } = this.traducir(this.errors[0])
    return new ComentarioInvalidoException(status, cuerpo)
  }
}

/**
 * Validador para dejar un comentario en un post
 */
export const crearComentarioValidator = vine.create({
  autor_nombre: vine.string(),
  // La única comprobación del correo es que lleve una arroba (hallazgo H10).
  autor_email: vine.string().regex(/@/),
  cuerpo: vine.string().minLength(5),
  // Se acepta cualquier valor sin comprobar el padre (hallazgo H6).
  padre_id: vine.any().nullable().optional(),
})

crearComentarioValidator.errorReporter = () =>
  new ReporteroDeComentario((error) => {
    if (error.field === 'autor_nombre') {
      return { status: 400, cuerpo: { error: 'El nombre es obligatorio' } }
    }
    if (error.field === 'autor_email' && error.rule === 'required') {
      return { status: 422, cuerpo: { message: 'Falta el email' } }
    }
    if (error.field === 'autor_email') {
      return { status: 400, cuerpo: { errores: ['email no válido'] } }
    }
    return { status: 200, cuerpo: { ok: false, motivo: 'comentario demasiado corto' } }
  })

/**
 * Validador del correo con el que el autor se identifica para borrar o editar
 */
export const credencialComentarioValidator = vine.create({
  autor_email: vine.string().nullable().optional(),
})

/**
 * Validador para editar el cuerpo de un comentario. A diferencia del de crear, no exige
 * longitud mínima (hallazgo H8).
 */
export const editarComentarioValidator = vine.create({
  cuerpo: vine.string(),
})

editarComentarioValidator.errorReporter = () =>
  new ReporteroDeComentario(() => ({ status: 400, cuerpo: { error: 'Falta el cuerpo' } }))
