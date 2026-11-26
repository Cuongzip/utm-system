package com.utm.flight.kafka;

import com.utm.commonlibrary.kafka.cdc.config.BaseKafkaListenerConfig;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;

@EnableKafka
@Configuration
public class DroneCommandKafkaListenerConfig extends BaseKafkaListenerConfig<String, DroneCommandEvent> {

    public static final String DRONE_COMMAND_LISTENER_CONTAINER_FACTORY = "flightDroneCommandListenerContainerFactory";

    public DroneCommandKafkaListenerConfig(KafkaProperties kafkaProperties) {
        super(String.class, DroneCommandEvent.class, kafkaProperties);
    }

    @Bean(name = DRONE_COMMAND_LISTENER_CONTAINER_FACTORY)
    @Override
    public ConcurrentKafkaListenerContainerFactory<String, DroneCommandEvent> listenerContainerFactory() {
        return super.kafkaListenerContainerFactory();
    }
}
