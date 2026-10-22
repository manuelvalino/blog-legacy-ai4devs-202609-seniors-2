import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import { ComentarioService } from '#services/comentario_service'
import ComentarioTransformer from '#transformers/comentario_transformer'
import {
  crearComentarioValidator,
  credencialComentarioValidator,
  editarComentarioValidator,
} from '#validators/comentario'

@inject()
export default class ComentariosController {
  constructor(private comentarioService: ComentarioService) {}

  /**
   * El 404 del post se comprueba antes que la entrada, como en la ruta legacy.
   */
  async store({ params, request, response, serialize }: HttpContext) {
    const post = await this.comentarioService.buscarPostPublicado(params.slug)
    const datos = await request.validateUsing(crearComentarioValidator)

    const comentario = await this.comentarioService.crear(post, datos)

    response.status(201)
    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(comentario) })
  }

  async destroy({ params, request, serialize }: HttpContext) {
    const { autor_email: autorEmail } = await request.validateUsing(credencialComentarioValidator)

    const comentario = await this.comentarioService.borrar(
      params.id,
      request.header('x-clave-moderacion'),
      autorEmail
    )

    return serialize.withoutWrapping(
      ComentarioTransformer.transform(comentario).useVariant('toBorrado')
    )
  }

  /**
   * El permiso se comprueba antes que el cuerpo, como en la ruta legacy: 404 → 403 → 400.
   */
  async update({ params, request, serialize }: HttpContext) {
    const { autor_email: autorEmail } = await request.validateUsing(credencialComentarioValidator)
    const comentario = await this.comentarioService.comprobarEdicion(params.id, autorEmail)
    const { cuerpo } = await request.validateUsing(editarComentarioValidator)

    const editado = await this.comentarioService.editar(comentario, cuerpo)

    return serialize.withoutWrapping({ comentario: ComentarioTransformer.transform(editado) })
  }
}
