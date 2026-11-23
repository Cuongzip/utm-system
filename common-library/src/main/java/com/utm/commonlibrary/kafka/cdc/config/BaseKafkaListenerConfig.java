package com.utm.commonlibrary.kafka.cdc.config;

import java.util.Map;
import org.springframework.boot.kafka.autoconfigure.KafkaProperties;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JacksonJsonDeserializer;

public abstract class BaseKafkaListenerConfig<K, V> {

    private final Class<K> keyType;
    private final Class<V> valueType;
    private final KafkaProperties kafkaProperties;

    public BaseKafkaListenerConfig(Class<K> keyType, Class<V> valueType, KafkaProperties kafkaProperties) {
        this.keyType = keyType;
        this.valueType = valueType;
        this.kafkaProperties = kafkaProperties;
    }

    public abstract ConcurrentKafkaListenerContainerFactory<K, V> listenerContainerFactory();

    public ConcurrentKafkaListenerContainerFactory<K, V> kafkaListenerContainerFactory() {
        var factory = new ConcurrentKafkaListenerContainerFactory<K, V>();
        factory.setConsumerFactory(typeConsumerFactory(keyType, valueType));
        return factory;
    }

    @SuppressWarnings("unchecked")
    private ConsumerFactory<K, V> typeConsumerFactory(Class<K> keyClazz, Class<V> valueClazz) {
        Map<String, Object> props = buildConsumerProperties();
        org.apache.kafka.common.serialization.Deserializer<K> keyDeserializer = String.class.equals(keyClazz)
                ? (org.apache.kafka.common.serialization.Deserializer<K>) new org.apache.kafka.common.serialization.StringDeserializer()
                : getJsonDeserializer(keyClazz);
        var keyDeserialize = new ErrorHandlingDeserializer<>(keyDeserializer);
        var valueDeserialize = new ErrorHandlingDeserializer<>(getJsonDeserializer(valueClazz));
        return new DefaultKafkaConsumerFactory<>(props, keyDeserialize, valueDeserialize);
    }

    private static <T> JacksonJsonDeserializer<T> getJsonDeserializer(Class<T> clazz) {
        var jsonDeserializer = new JacksonJsonDeserializer<>(clazz);
        jsonDeserializer.addTrustedPackages("*");
        return jsonDeserializer;
    }

    private Map<String, Object> buildConsumerProperties() {
        Map<String, Object> props = new java.util.HashMap<>(kafkaProperties.buildConsumerProperties());
        props.keySet().removeIf(key -> key.startsWith("spring.json.") || key.startsWith("spring.deserializer."));
        return props;
    }
}
