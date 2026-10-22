import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import testUtils from '@adonisjs/core/services/test_utils'
import { CAMPOS_COMENTARIO, FORMATO_CREADO_EN, unPostPublicado } from '#tests/fixtures/blog'

/**
 * Caracterización de POST /posts/:slug/comentarios.
 *
 * Fija lo que el endpoint hace HOY, bugs incluidos. Los que se afirman a propósito llevan
 * su número de hallazgo de docs/auditoria/comentarios.md (rama feat/auditoria-comentarios).
 */
const CUERPO_VALIDO = {
  autor_nombre: 'Lucía Ferrer',
  autor_email: 'lucia.ferrer@ejemplo.es',
  cuerpo: 'Un comentario suficientemente largo.',
}

async function comentariosGuardados() {
  return db.from('comentarios').where('post_id', 9001)
}

test.group('POST /posts/:slug/comentarios', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('deja un comentario pendiente y devuelve la fila completa', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(CUERPO_VALIDO)

    // Assert
    respuesta.assertStatus(201)
    const cuerpo = respuesta.body()
    assert.deepEqual(Object.keys(cuerpo), ['comentario'])
    const comentario = cuerpo.comentario
    assert.sameMembers(Object.keys(comentario), CAMPOS_COMENTARIO)
    assert.isNumber(comentario.id)
    assert.match(comentario.creado_en, FORMATO_CREADO_EN)
    assert.deepInclude(comentario, {
      post_id: 9001,
      autor_nombre: 'Lucía Ferrer',
      cuerpo: 'Un comentario suficientemente largo.',
      estado: 'pendiente',
      padre_id: null,
    })
    // BUG caracterizado (H11): la respuesta devuelve el correo de quien comenta.
    assert.equal(comentario.autor_email, 'lucia.ferrer@ejemplo.es')
    assert.notProperty(cuerpo, 'data')

    const guardados = await comentariosGuardados()
    assert.lengthOf(guardados, 1)
    assert.equal(guardados[0].id, comentario.id)
    assert.equal(guardados[0].estado, 'pendiente')
    assert.equal(guardados[0].creado_en, comentario.creado_en)
  })

  test('guarda y devuelve padre_id cuando llega', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())
    await db.table('comentarios').insert({
      id: 9101,
      post_id: 9001,
      autor_nombre: 'Ana',
      autor_email: 'ana@ejemplo.es',
      cuerpo: 'Comentario padre',
      estado: 'aprobado',
      creado_en: '2026-01-02 09:30:00',
      padre_id: null,
    })

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, padre_id: 9101 })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 9101)
  })

  test('acepta un padre_id que no existe', async ({ client, assert }) => {
    // BUG caracterizado (H6): padre_id no se comprueba.
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, padre_id: 424242 })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.padre_id, 424242)
  })

  test('acepta un cuerpo de exactamente 5 caracteres', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, cuerpo: 'cinco' })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.cuerpo, 'cinco')
  })

  test('responde 404 si el post no existe', async ({ client, assert }) => {
    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json(CUERPO_VALIDO)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })

  test('responde 404 si el post está en borrador', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado({ estado: 'borrador' }))

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json(CUERPO_VALIDO)

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
    assert.lengthOf(await comentariosGuardados(), 0)
  })

  test('el 404 del post gana a un cuerpo inválido', async ({ client, assert }) => {
    // Act
    const respuesta = await client.post('/posts/no-existe/comentarios').json({})

    // Assert
    respuesta.assertStatus(404)
    assert.deepEqual(respuesta.body(), { error: 'Post no encontrado' })
  })

  test('responde 400 si falta el nombre', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, autor_nombre: undefined })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
    assert.lengthOf(await comentariosGuardados(), 0)
  })

  test('responde 400 si el nombre llega vacío', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, autor_nombre: '' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
  })

  test('el error del nombre gana a los demás', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client.post('/posts/post-de-prueba/comentarios').json({})

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { error: 'El nombre es obligatorio' })
  })

  test('responde 422 con otra forma si falta el correo', async ({ client, assert }) => {
    // BUG caracterizado (H9): cada error tiene su código y su forma.
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ autor_nombre: 'Lucía Ferrer', cuerpo: 'x' })

    // Assert
    respuesta.assertStatus(422)
    assert.deepEqual(respuesta.body(), { message: 'Falta el email' })
    assert.lengthOf(await comentariosGuardados(), 0)
  })

  test('responde 400 con una lista si el correo no lleva arroba', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, autor_email: 'sin-arroba', cuerpo: 'x' })

    // Assert
    respuesta.assertStatus(400)
    assert.deepEqual(respuesta.body(), { errores: ['email no válido'] })
    assert.lengthOf(await comentariosGuardados(), 0)
  })

  test('acepta cualquier correo que lleve una arroba', async ({ client, assert }) => {
    // BUG caracterizado (H10): la única comprobación del correo es la arroba.
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, autor_email: '@' })

    // Assert
    respuesta.assertStatus(201)
    assert.equal(respuesta.body().comentario.autor_email, '@')
  })

  test('responde 200 con ok false si el cuerpo es corto', async ({ client, assert }) => {
    // BUG caracterizado (H9): un error de validación sale como 200.
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, cuerpo: 'cuat' })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.lengthOf(await comentariosGuardados(), 0)
  })

  test('responde 200 con ok false si falta el cuerpo', async ({ client, assert }) => {
    // Arrange
    await db.table('posts').insert(unPostPublicado())

    // Act
    const respuesta = await client
      .post('/posts/post-de-prueba/comentarios')
      .json({ ...CUERPO_VALIDO, cuerpo: undefined })

    // Assert
    respuesta.assertStatus(200)
    assert.deepEqual(respuesta.body(), { ok: false, motivo: 'comentario demasiado corto' })
    assert.lengthOf(await comentariosGuardados(), 0)
  })
})
