package com.utm.connectivity.kafka;

import com.utm.commonlibrary.kafka.cdc.config.BaseKafkaListenerConfig;
import com.utm.commonlibrary.kafka.event.DroneCommandEvent;
import com.utm.commonlibrary.kafka.event.EmergencyStateEvent;
import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;

@EnableKafka
@Configuration
public class ConnectivityKafkaConfig {

    public static final String FLIGHT_FACTORY = "connectivityFlightKafkaFactory";
    public static final String EMERGENCY_FACTORY = "connectivityEmergencyKafkaFactory";
    public static final String COMMAND_FACTORY = "connectivityCommandKafkaFactory";

    @Configuration
    static class FlightListenerConfig extends BaseKafkaListenerConfig<String, FlightLifecycleEvent> {
        FlightListenerConfig(KafkaProperties kafkaProperties) {
            super(String.class, FlightLifecycleEvent.class, kafkaProperties);
        }

        @Bean(name = FLIGHT_FACTORY)
        @Override
        public ConcurrentKafkaListenerContainerFactory<String, FlightLifecycleEvent> listenerContainerFactory() {
            return super.kafkaListenerContainerFactory();
        }
    }

    @Configuration
    static class EmergencyListenerConfig extends BaseKafkaListenerConfig<String, EmergencyStateEvent> {
        EmergencyListenerConfig(KafkaProperties kafkaProperties) {
            super(String.class, EmergencyStateEvent.class, kafkaProperties);
        }

        @Bean(name = EMERGENCY_FACTORY)
        @Override
        public ConcurrentKafkaListenerContainerFactory<String, EmergencyStateEvent> listenerContainerFactory() {
            return super.kafkaListenerContainerFactory();
        }
    }

    @Configuration
    static class CommandListenerConfig extends BaseKafkaListenerConfig<String, DroneCommandEvent> {
        CommandListenerConfig(KafkaProperties kafkaProperties) {
            super(String.class, DroneCommandEvent.class, kafkaProperties);
        }

        @Bean(name = COMMAND_FACTORY)
        @Override
        public ConcurrentKafkaListenerContainerFactory<String, DroneCommandEvent> listenerContainerFactory() {
            return super.kafkaListenerContainerFactory();
        }
    }
}
