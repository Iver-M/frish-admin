const invalidResponse = () => Object.assign(new Error('Unexpected Consumer intake response.'), { code: 'invalid-response' })
export function createConsumerIntakeClient(invoke) {
  return {
    async list(options = {}) {
      const result = await invoke('listPendingConsumerConcerns', options)
      if (!Array.isArray(result?.concerns) || (result.nextPageToken !== null && typeof result.nextPageToken !== 'string')) throw invalidResponse()
      return result
    },
    async detail(reportId) {
      try {
        const result = await invoke('getPendingConsumerConcern', { reportId })
        if (result?.concern?.reportId !== reportId) throw invalidResponse()
        return result
      } catch (error) { error.operation = 'intake-detail'; throw error }
    },
    async accept(reportId, { title, assignedMarket } = {}) {
      const result = await invoke('promoteConsumerConcern', { reportId, ...(title ? { title } : {}), ...(assignedMarket ? { assignedMarket } : {}) })
      if (result?.caseId !== `case_${reportId}_v1` || typeof result.alreadyPromoted !== 'boolean') throw invalidResponse()
      return result
    },
    async reject(reportId, internalReason) {
      const result = await invoke('rejectConsumerConcern', { reportId, internalReason })
      if (result?.reportId !== reportId || result.decision !== 'rejected') throw invalidResponse()
      return result
    },
  }
}
