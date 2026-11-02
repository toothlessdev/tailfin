package com.toothlessdev.tailfin.core.event

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Service
class ExternalEventService(
    private val externalEventRepository: ExternalEventRepository
) {
    fun saveIfNew(event: ExternalEvent): Boolean {
        val isAlreadyExists = this.externalEventRepository.existsById(event.id)

        if (!isAlreadyExists) {
            this.externalEventRepository.save(event)
            return true
        }
        return false
    }

    @Transactional
    fun markAsRouted(id: String) {
        val event = this.externalEventRepository.findById(id).orElseThrow()
        event.markAsRouted(Instant.now())
    }
}               