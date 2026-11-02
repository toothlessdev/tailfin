package com.toothlessdev.tailfin

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class TailfinServerApplication

fun main(args: Array<String>) {
    runApplication<TailfinServerApplication>(*args)
}
