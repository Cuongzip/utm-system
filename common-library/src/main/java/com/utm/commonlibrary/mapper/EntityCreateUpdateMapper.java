package com.utm.commonlibrary.mapper;

import org.mapstruct.BeanMapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

public interface EntityCreateUpdateMapper<M, V, R> {

    M toModel(V vm);

    V toVm(M m);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void partialUpdate(@MappingTarget M m, V v);

    R toVmResponse(M m);
}
