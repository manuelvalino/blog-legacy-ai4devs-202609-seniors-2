import Comentario from '#models/comentario'
import Post from '#models/post'

type NuevoComentario = Pick<
  Comentario,
  'postId' | 'autorNombre' | 'autorEmail' | 'cuerpo' | 'estado' | 'creadoEn' | 'padreId'
>

export class ComentarioRepository {
  buscarPostPublicado(slug: string) {
    return Post.query().where('slug', slug).where('estado', 'publicado').first()
  }

  buscarPorId(id: string | number) {
    return Comentario.find(id)
  }

  /**
   * Inserta y devuelve la última fila de la tabla, no la insertada: es lo que hacía la ruta
   * legacy (hallazgo H4, se corrige en su propia tarea).
   */
  async crear(datos: NuevoComentario) {
    await Comentario.create(datos)
    return Comentario.query().orderBy('id', 'desc').firstOrFail()
  }

  async actualizarCuerpo(comentario: Comentario, cuerpo: string) {
    comentario.cuerpo = cuerpo
    await comentario.save()
    return Comentario.findOrFail(comentario.id)
  }

  /** Borrado físico, sin tocar las respuestas (hallazgo H7). */
  borrar(comentario: Comentario) {
    return comentario.delete()
  }
}
