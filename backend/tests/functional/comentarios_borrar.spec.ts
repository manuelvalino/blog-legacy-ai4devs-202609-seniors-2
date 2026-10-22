import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { CLAVE_MODERACION, unComentario, unPostPublicado } from '#tests/fixtures/blog'

/**
 * Caracterización de DELETE /comentarios/:id. Fija lo que hace HOY, bugs incluidos.
 */
async function existeComentario(id: number) {
  const fila = await db.from('comentarios').where('id', id).first()
  return fila !== null
}

test.group('DELETE /comentarios/:id', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())
  group.each.setup(async () => {
    await db.table('posts').insert(unPostPublicado())
  })

  test('borra con la clave de moderación', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existeComentario(9101))
  })

  test('borra quien trae el correo del autor', async ({ client, assert }) => {
    // BUG caracterizado (H2): el correo basta para borrar, también un comentario aprobado.
    // Arrange
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existeComentario(9101))
  })

  test('compara el correo sin mayúsculas ni espacios', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: '  LUCIA.Ferrer@Ejemplo.ES ' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
    assert.isFalse(await existeComentario(9101))
  })

  test('acepta el correo en la query string', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .qs({ autor_email: 'lucia.ferrer@ejemplo.es' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { borrado: true })
  })

  test('deja huérfanas las respuestas del comentario borrado', async ({ client, assert }) => {
    // BUG caracterizado (H7): borrado físico sin cascada.
    // Arrange
    await db.table('comentarios').insert(unComentario({ estado: 'aprobado' }))
    await db.table('comentarios').insert(unComentario({ id: 9102, padre_id: 9101 }))

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(200)
    assert.isFalse(await existeComentario(9101))
    const huerfana = await db.from('comentarios').where('id', 9102).first()
    assert.equal(huerfana.padre_id, 9101)
  })

  test('responde 403 con un correo ajeno', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .json({ autor_email: 'otra@ejemplo.es' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existeComentario(9101))
  })

  test('responde 403 sin correo ni clave', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete('/comentarios/9101')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existeComentario(9101))
  })

  test('responde 403 con el correo vacío', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client.delete('/comentarios/9101').json({ autor_email: '' })

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existeComentario(9101))
  })

  test('responde 403 con una clave equivocada', async ({ client, assert }) => {
    // Arrange
    await db.table('comentarios').insert(unComentario())

    // Act
    const respuesta = await client
      .delete('/comentarios/9101')
      .header('x-clave-moderacion', 'otra-clave')

    // Assert
    respuesta.assertStatus(403)
    assert.deepEqual(respuesta.body(), { error: 'No puedes borrar este comentario' })
    assert.isTrue(await existeComentario(9101))
  })

  test('responde 404 si el comentario no existe', async ({ client, assert }) => {
    // Act
    const respuesta = await client
      .delete('/comentarios/424242')
      .header('x-clave-moderacion', CLAVE_MODERACION)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Comentario no encontrado' })
  })
})
