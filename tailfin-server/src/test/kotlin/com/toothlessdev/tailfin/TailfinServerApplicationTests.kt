package com.toothlessdev.tailfin

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest(properties = ["spring.datasource.url=jdbc:h2:mem:tailfin-test;DB_CLOSE_DELAY=-1"])
class TailfinServerApplicationTests {

	@Test
	fun contextLoads() {
	}

}
