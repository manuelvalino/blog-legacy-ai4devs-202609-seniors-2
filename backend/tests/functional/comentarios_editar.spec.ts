import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import {
  CAMPOS_COMENTARIO,
  CLAVE_MODERACION,
  unComentario,
  unPostPublicado,
} from '#tests/fixtures/blog'

/**
 * Caracterización de PATCH /comentarios/:id. Fija lo que hace HOY, bugs incluidos.
 */
async function cuerpoGuardado(id: number) {
  const fila = await db.from('comentarios').where('id', id).first()
  return fila.cuerpo
}

test.group('PATCH /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(async () => {
    await db.table('posts').insert(unPostPublicado())
  })

  test('edita un comentario pendiente con el correo exacto', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Texto corregido.' })

    // Assert
    respuesta.assertStatus(200)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['comentario'])
    assert.sameMembers(Object.keys(cuerpo.comentario), CAMPOS_COMENTARIO)
    // BUG caracterizado (H11): la respuesta devuelve el correo de quien comenta.
    assert.deepEqual(cuerpo.comentario, {
      id: 9101,
      post_id: 9001,
      autor_nombre: 'Lucía Ferrer',
      autor_email: 'lucia.ferrer@ejemplo.es',
      cuerpo: 'Texto corregido.',
      estado: 'pendiente',
      creado_en: '2026-01-02 09:30:00',
      padre_id: null,
    })
    assert.equal(await cuerpoGuardado(9101), 'Texto corregido.')
  })

  test('devuelve padre_id tal cual en una respuesta', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario({ id: 9102, padre_id: 9101 }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9102')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Respuesta corregida.' })

    // Assert
    respuesta.assertStatus(200)
    assert.equal(respuesta.body().comentario.padre_id, 9101)
  })

  test('acepta un cuerpo de un solo carácter', async ({ client, assert }) => {
    // BUG caracterizado (H8): el PATCH no exige la longitud mínima del POST.
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'x' })

    // Assert
    respuesta.assertStatus(200)
    assert.equal(respuesta.body().comentario.cuerpo, 'x')
  })

  test('responde 403 si el correo cambia de mayúsculas', async ({ client, assert }) => {
    // BUG caracterizado (H8): la regla no coincide con la del DELETE.
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'LUCIA.FERRER@EJEMPLO.ES', cuerpo: 'Texto corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(9101), 'Un comentario ya guardado.')
  })

  test('responde 403 si el comentario ya no está pendiente', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Texto corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
    assert.equal(await cuerpoGuardado(9101), 'Un comentario ya guardado.')
  })

  test('responde 403 aunque llegue la clave de moderación', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)
      .json({ cuerpo: 'Texto corregido.' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })

  test('responde 400 si falta el cuerpo', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'Falta el cuerpo' })
    assert.equal(await cuerpoGuardado(9101), 'Un comentario ya guardado.')
  })

  test('responde 400 si el cuerpo llega vacío', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: '' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'Falta el cuerpo' })
    assert.equal(await cuerpoGuardado(9101), 'Un comentario ya guardado.')
  })

  test('el 403 gana a la falta de cuerpo', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .patch('/comentarios/9101')
      .json({ autor_email: 'otra@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes editar este comentario' })
  })

  test('responde 404 si el comentario no existe', async ({ client, assert }) => {
    // Act
    const respuesta = await client
      .patch('/comentarios/424242')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es', cuerpo: 'Texto corregido.' })

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })
})
