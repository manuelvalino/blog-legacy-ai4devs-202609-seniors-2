import app from '@adonisjs/core/services/app'
import { type HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import NoEncontradoException from '#exceptions/no_encontrado_exception'
import NoPermitidoException from '#exceptions/no_permitido_exception'
import ComentarioInvalidoException from '#exceptions/comentario_invalido_exception'

export default class HttpExceptionHandler extends ExceptionHandler {
  /**
   * In debug mode, the exception handler will display verbose errors
   * with pretty printed stack traces.
   */
  protected debug = !app.inProduction

  /**
   * The method is used for handling errors and returning
   * response to the client
   */
  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof NoEncontradoException || error instanceof NoPermitidoException) {
      return ctx.response.status(error.status).send({ error: error.message })
    }
    if (error instanceof ComentarioInvalidoException) {
      return ctx.response.status(error.status).send(error.cuerpo)
    }
    return super.handle(error, ctx)
  }

  /**
   * The method is used to report error to the logging service or
   * the a third party error monitoring service.
   *
   * @note You should not attempt to send a response from this method.
   */
  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
