import createPersist from 'vuex-localstorage'
import { createAction, handleAction, $inject } from 'vuex-actions'
import Normalizer from 'utils/normalizer'
import request, { merge } from 'utils/request'

export default ({ namespace, expires = 0, source, getters, ...options }) => {
  const LIST = `${namespace}List`
  const POST = `${namespace}Post`
  const DELETE = `${namespace}Delete`
  const PATCH = `${namespace}Patch`
  const PUT = `${namespace}Put`
  const GET = `${namespace}Get`

  const REST = {
    list (query) {
      return request(source, merge({}, options, { query }))
    },
    post (body) {
      return request(source, merge({}, options, {
        method: 'POST',
        body
      }))
    },
    delete (id) {
      return request(`${source}/{id}`, merge({}, options, {
        method: 'DELETE',
        params: { id }
      }))
    },
    patch (id, body) {
      return request(`${source}/{id}`, merge({}, options, {
        method: 'PATCH',
        params: { id },
        body
      }))
    },
    put (id, body) {
      return request(`${source}/{id}`, merge({}, options, {
        method: 'PUT',
        params: { id },
        body
      }))
    },
    get (id) {
      return request(`${source}/{id}`, merge({}, options, {
        params: { id }
      }))
    }
  }

  const normalizer = new Normalizer()

  const persist = createPersist(namespace, {
    fetching: false,
    entities: {}
  }, {
    expires
  })

  const state = persist.get()

  /*eslint babel/new-cap: 0*/

  const actions = {
    [LIST]: createAction(LIST, query => REST.list(query)),
    [POST]: createAction(POST, body => REST.post(body)),
    [PATCH]: createAction(PATCH, (id, body) => REST.patch(id, body)),
    [PUT]: createAction(PUT, (id, body) => REST.put(id, body)),
    [GET]: createAction(GET, id => REST.get(id)),
    [DELETE]: createAction(DELETE, id => ({
      // destroy, removing data from remote
      _: REST.delete(id),
      // then return id (payload) for removing data from store
      id: $inject(() => id)('_')
    }))
  }

  const handleSingle = handleAction({
    pending (state) {
      state.fetching = true
    },
    success (state, mutation) {
      state.fetching = false
      const { entities } = normalizer.normalize([mutation])
      state.entities = { ...state.entities, ...entities }
      persist.set(state)
    },
    error (state) {
      state.fetching = false
    }
  })

  const mutations = {
    [LIST]: handleAction({
      pending (state) {
        state.fetching = true
      },
      success (state, mutation) {
        state.fetching = false
        const { entities } = normalizer.normalize(mutation)
        state.entities = { ...state.entities, ...entities }
        persist.set(state)
      },
      error (state) {
        state.fetching = false
      }
    }),
    [POST]: handleSingle,
    [PATCH]: handleSingle,
    [PUT]: handleSingle,
    [GET]: handleSingle,
    [DELETE]: handleAction({
      pending (state) {
        state.fetching = true
      },
      success (state, { id }) {
        state.fetching = false
        const { entities } = state
        delete entities[id]
        state.entities = { ...entities }
        persist.set(state)
      },
      error (state) {
        state.fetching = false
      }
    })
  }

  return {
    state,
    getters,
    actions,
    mutations
  }
}
