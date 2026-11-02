package com.toothlessdev.tailfin.core.event

import jakarta.persistence.EntityManager
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import java.time.Instant


@DataJpaTest
class ExternalEventRepositoryTest(
    @Autowired private val repository: ExternalEventRepository,
    @Autowired private val entityManager: EntityManager
) {
    companion object {
        private const val ID = "slack:C1:1,0"
        private const val SOURCE_NAME = "slack"
        private const val OCCURRED_AT = "2026-11-01T00:00:00Z"
    }

    @Nested
    inner class FindById {
        @Test
        fun `저장한 이벤트를 DB 에서 다시 읽는다`() {
            val event = ExternalEvent(
                id = ID,
                kind = "mention",
                sourceName = "slack",
                occurredAt = Instant.parse(
                    OCCURRED_AT
                ),
                raw = "{}"
            )

            repository.saveAndFlush(event)
            entityManager.clear()

            val found = repository.findById(ID).orElseThrow()
            assertThat(found.sourceName).isEqualTo(SOURCE_NAME)
            assertThat(found.routedAt).isNull()
        }
    }

    @Nested
    inner class FindOldestUnroutedEvent {
        @Test
        fun `라우팅 되지 않은 이벤트 중 가장 오래된 이벤트를 반환한다`() {
            val eventRouted = createEvent(id = "A")
                .apply { routedAt = Instant.parse(EVENT_ROUTED_AT) }

            val eventUnRouted1 = createEvent(
                id = "B", occurredAt = Instant.parse("2026-11-01T00:00:00Z")
            )
            val eventUnRouted2 = createEvent(
                id = "C", occurredAt = Instant.parse("2026-11-01T00:01:00Z")
            )

            repository.saveAll(
                listOf(eventRouted, eventUnRouted1, eventUnRouted2)
            )

            val oldestUnroutedEvent = repository.findOldestUnroutedEvent()
                ?: throw NoSuchElementException("라우팅되지 않은 이벤트가 없습니다")
            assertThat(oldestUnroutedEvent.id).isEqualTo("B")
        }
    }
}
