package com.utm.emergency.kafka;

import com.utm.commonlibrary.kafka.cdc.config.BaseKafkaListenerConfig;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;

@EnableKafka
@Configuration
public class FlightKafkaListenerConfig extends BaseKafkaListenerConfig<String, FlightLifecycleEvent> {

    public static final String FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY = "emergencyFlightLifecycleListenerContainerFactory";

    public FlightKafkaListenerConfig(KafkaProperties kafkaProperties) {
        super(String.class, FlightLifecycleEvent.class, kafkaProperties);
    }

    @Bean(name = FLIGHT_LIFECYCLE_LISTENER_CONTAINER_FACTORY)
    @Override
    public ConcurrentKafkaListenerContainerFactory<String, FlightLifecycleEvent> listenerContainerFactory() {
        return super.kafkaListenerContainerFactory();
    }
}
