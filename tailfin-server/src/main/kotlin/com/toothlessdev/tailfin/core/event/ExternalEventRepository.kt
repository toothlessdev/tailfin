package com.toothlessdev.tailfin.core.event

import org.hibernate.query.spi.Limit
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface ExternalEventRepository : JpaRepository<ExternalEvent, String> {
    @Query(
        value = """
            SELECT e FROM ExternalEvent e
            WHERE e.routedAt is null
            ORDER BY e.receivedAt, e.occurredAt, e.id
            LIMIT 1
        """
    )
    fun findOldestUnroutedEvent(): ExternalEvent?
}