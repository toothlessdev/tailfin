package com.toothlessdev.tailfin.core.event

import java.time.Instant

const val EVENT_ID = "slack:C1:1.0"
const val EVENT_KIND = "mention"
const val EVENT_SOURCENAME = "slack"
const val EVENT_OCCURRED_AT = "2026-11-01T00:00:00Z"
const val EVENT_ROUTED_AT = "2026-11-02T00:00:00Z"

fun createEvent(
    id: String = EVENT_ID,
    kind: String = EVENT_KIND,
    sourceName: String = EVENT_SOURCENAME,
    occurredAt: Instant = Instant.parse(EVENT_OCCURRED_AT),
    raw: String = ""
): ExternalEvent {
    return ExternalEvent(
        id,
        kind,
        sourceName,
        occurredAt,
        raw,
    )
}