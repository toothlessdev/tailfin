package com.toothlessdev.tailfin.core.event

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "external_events")
class ExternalEvent(
    @Id val id: String,
    val kind: String,
    val sourceName: String,
    val occurredAt: Instant,
    val raw: String
) {
    val receivedAt: Instant = Instant.now()
    var routedAt: Instant? = null

    fun markAsRouted(routedAt: Instant) {
        this.routedAt = routedAt
    }
}