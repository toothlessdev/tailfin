package com.toothlessdev.tailfin.core.event

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import java.time.Instant

@DataJpaTest
class ExternalEventTest {
    @Nested
    inner class MarkAsRouted {
        @Test
        fun `routedAt 의 값을 업데이트 한다`() {
            val event = createEvent()
            val routedAt = Instant.parse("2026-11-02T00:00:00Z")

            assertThat(event.routedAt).isNull()
            event.markAsRouted(routedAt)
            assertThat(event.routedAt).isEqualTo(routedAt)
        }
    }
}