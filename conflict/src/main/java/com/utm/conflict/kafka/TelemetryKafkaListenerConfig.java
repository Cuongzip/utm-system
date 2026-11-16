package com.utm.conflict.kafka;

import com.utm.commonlibrary.kafka.cdc.config.BaseKafkaListenerConfig;
import com.utm.conflict.viewmodel.client.TelemetryBriefVm;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;

@EnableKafka
@Configuration
public class TelemetryKafkaListenerConfig extends BaseKafkaListenerConfig<String, TelemetryBriefVm> {

    public static final String TELEMETRY_LISTENER_CONTAINER_FACTORY = "telemetryListenerContainerFactory";

    public TelemetryKafkaListenerConfig(KafkaProperties kafkaProperties) {
        super(String.class, TelemetryBriefVm.class, kafkaProperties);
    }

    @Bean(name = TELEMETRY_LISTENER_CONTAINER_FACTORY)
    @Override
    public ConcurrentKafkaListenerContainerFactory<String, TelemetryBriefVm> listenerContainerFactory() {
        return super.kafkaListenerContainerFactory();
    }
}

