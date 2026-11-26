package com.utm.drone.kafka;

import com.utm.commonlibrary.kafka.cdc.config.BaseKafkaListenerConfig;
import com.utm.commonlibrary.kafka.event.DroneCommandAckEvent;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;

@Configuration
public class DroneCommandAckKafkaListenerConfig extends BaseKafkaListenerConfig<String, DroneCommandAckEvent> {

    public static final String DRONE_COMMAND_ACK_LISTENER_FACTORY = "droneCommandAckListenerContainerFactory";

    public DroneCommandAckKafkaListenerConfig(KafkaProperties kafkaProperties) {
        super(String.class, DroneCommandAckEvent.class, kafkaProperties);
    }

    @Bean(name = DRONE_COMMAND_ACK_LISTENER_FACTORY)
    @Override
    public ConcurrentKafkaListenerContainerFactory<String, DroneCommandAckEvent> listenerContainerFactory() {
        return super.kafkaListenerContainerFactory();
    }
}
