import { defineStore } from 'pinia'

const OFFLINE_QUEUE_KEY = 'agrogestion.offlineQueue.v1'

const useOfflineSyncStore = defineStore('offlineSync', {
  state: () => ({
    offlineQueue: []
  }),
  persist: {
    key: OFFLINE_QUEUE_KEY,
    storage: localStorage
  },
  actions: {
    addToQueue(action) {
      this.offlineQueue.push(action)
    },
    clearQueue() {
      this.offlineQueue = []
    },
    async syncQueue() {
      // Implementar lógica para sincronizar la cola offline
      // con el backend cuando se recupere la conexión
    }
  }
})

export default useOfflineSyncStore