import { Exception } from '@adonisjs/core/exceptions'

export default class NoEncontradoException extends Exception {
  static status = 404
}
