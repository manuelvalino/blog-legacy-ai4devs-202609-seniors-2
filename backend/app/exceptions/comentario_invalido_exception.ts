import { ValidationError } from '@vinejs/vine'

/**
 * Error de validación de un comentario que lleva ya el código y el cuerpo de la respuesta
 * legacy, porque cada caso tiene los suyos (hallazgo H9). Lo pinta `handler.ts`.
 */
export default class ComentarioInvalidoException extends ValidationError {
  constructor(
    status: number,
    public cuerpo: Record<string, unknown>
  ) {
    super([cuerpo])
    this.status = status
  }
}
