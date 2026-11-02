package com.toothlessdev.tailfin.core.event

import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.context.annotation.Import
import java.time.Instant


@DataJpaTest
@Import(ExternalEventService::class)
class ExternalEventServiceTest(
    @Autowired private val externalEventService: ExternalEventService,
    @Autowired private val externalEventRepository: ExternalEventRepository
) {
    @Nested
    inner class SaveIfNew {
        @Test
        fun `동일한 id 가 없으면 저장하고 true 를 반환한다`() {
            assertThat(externalEventService.saveIfNew(createEvent())).isTrue()
            assertThat(externalEventRepository.count()).isEqualTo(1)
        }

        @Test
        fun `동일한 id 가 있으면 저장하지 않고 false 를 반환한다`() {
            assertThat(externalEventService.saveIfNew(createEvent(EVENT_ID))).isTrue()
            assertThat(externalEventService.saveIfNew(createEvent(EVENT_ID))).isFalse()
        }
    }

}
