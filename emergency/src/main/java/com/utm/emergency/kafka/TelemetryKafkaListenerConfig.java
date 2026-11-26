package com.utm.emergency.kafka;

import com.utm.commonlibrary.kafka.cdc.config.BaseKafkaListenerConfig;
import com.utm.emergency.viewmodel.client.TelemetryStreamVm;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;

@EnableKafka
@Configuration
public class TelemetryKafkaListenerConfig extends BaseKafkaListenerConfig<String, TelemetryStreamVm> {

    public static final String TELEMETRY_LISTENER_CONTAINER_FACTORY = "emergencyTelemetryListenerContainerFactory";

    public TelemetryKafkaListenerConfig(KafkaProperties kafkaProperties) {
        super(String.class, TelemetryStreamVm.class, kafkaProperties);
    }

    @Bean(name = TELEMETRY_LISTENER_CONTAINER_FACTORY)
    @Override
    public ConcurrentKafkaListenerContainerFactory<String, TelemetryStreamVm> listenerContainerFactory() {
        return super.kafkaListenerContainerFactory();
    }
}
