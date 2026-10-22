import { DateTime } from 'luxon'
import { inject } from '@adonisjs/core'
import type Post from '#models/post'
import type Comentario from '#models/comentario'
import { ComentarioRepository } from '#repositories/comentario_repository'
import NoEncontradoException from '#exceptions/no_encontrado_exception'
import NoPermitidoException from '#exceptions/no_permitido_exception'

/**
 * Clave que da poder de moderación al borrar. Sigue escrita en el código como en la ruta
 * legacy (hallazgo H3); sacarla a variables de entorno es una tarea aparte.
 */
const CLAVE_MODERACION = 'dev-secret-cambiar'

type DatosComentario = {
  autor_nombre: string
  autor_email: string
  cuerpo: string
  padre_id?: any
}

@inject()
export class ComentarioService {
  constructor(private repositorio: ComentarioRepository) {}

  async buscarPostPublicado(slug: string) {
    const post = await this.repositorio.buscarPostPublicado(slug)
    if (!post) {
      throw new NoEncontradoException('Post no encontrado')
    }
    return post
  }

  crear(post: Post, datos: DatosComentario) {
    return this.repositorio.crear({
      postId: post.id,
      autorNombre: datos.autor_nombre,
      autorEmail: datos.autor_email,
      cuerpo: datos.cuerpo,
      estado: 'pendiente',
      creadoEn: DateTime.utc(),
      // Se guarda sin comprobar que el padre exista (hallazgo H6).
      padreId: datos.padre_id ?? null,
    })
  }

  /**
   * Puede borrar quien trae la clave de moderación o el correo del autor, comparado sin
   * mayúsculas ni espacios (hallazgo H2: el correo basta).
   */
  async borrar(id: string, claveModeracion: string | undefined, autorEmail: string | null = '') {
    const comentario = await this.buscar(id)

    const esModerador = claveModeracion === CLAVE_MODERACION
    const esAutor = normalizar(comentario.autorEmail) === normalizar(autorEmail)
    if (!esModerador && !esAutor) {
      throw new NoPermitidoException('No puedes borrar este comentario')
    }

    await this.repositorio.borrar(comentario)
    return comentario
  }

  /**
   * Solo edita el autor, con el correo exacto, y mientras el comentario siga pendiente. No
   * admite la clave de moderación: la regla no coincide con la de borrar (hallazgo H8).
   */
  async comprobarEdicion(id: string, autorEmail: string | null = '') {
    const comentario = await this.buscar(id)
    if (comentario.autorEmail !== autorEmail || comentario.estado !== 'pendiente') {
      throw new NoPermitidoException('No puedes editar este comentario')
    }
    return comentario
  }

  editar(comentario: Comentario, cuerpo: string) {
    return this.repositorio.actualizarCuerpo(comentario, cuerpo)
  }

  private async buscar(id: string) {
    const comentario = await this.repositorio.buscarPorId(id)
    if (!comentario) {
      throw new NoEncontradoException('Comentario no encontrado')
    }
    return comentario
  }
}

function normalizar(email: string | null) {
  return String(email).toLowerCase().trim()
}
