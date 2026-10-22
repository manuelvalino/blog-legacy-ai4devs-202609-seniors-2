import { Exception } from '@adonisjs/core/exceptions'

export default class NoPermitidoException extends Exception {
  static status = 403
}
