package com.utm.emergency.service;

import com.utm.emergency.mapper.BlackboxEntryMapper;
import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.repository.BlackboxEntryRepository;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryPostVm;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryVm;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZonedDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BlackboxServiceImpl implements BlackboxService {

    private final BlackboxEntryRepository blackboxRepo;
    private final BlackboxEntryMapper blackboxMapper;

    @Override
    @Transactional
    public BlackboxEntryVm recordEntry(BlackboxEntryPostVm postVm) {
        BlackboxEntry entry = blackboxMapper.toEntity(postVm);
        BlackboxEntry saved = blackboxRepo.save(entry);
        return blackboxMapper.toVm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlackboxEntryVm> getIncidentBlackbox(String incidentId, ZonedDateTime from, ZonedDateTime to) {
        List<BlackboxEntry> list;
        if (from != null && to != null) {
            list = blackboxRepo.findByIncidentIdAndTimestampBetweenOrderByTimestampAsc(incidentId, from, to);
        } else {
            list = blackboxRepo.findByIncidentIdOrderByTimestampAsc(incidentId);
        }
        return blackboxMapper.toVmList(list);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BlackboxEntryVm> getFlightBlackbox(String flightId, ZonedDateTime from, ZonedDateTime to, int limit) {
        int pageLimit = (limit > 0 && limit <= 2000) ? limit : 1000;
        List<BlackboxEntry> list;
        if (from != null && to != null) {
            list = blackboxRepo.findByFlightIdAndTimestampBetweenOrderByTimestampAsc(flightId, from, to, PageRequest.of(0, pageLimit));
        } else {
            list = blackboxRepo.findByFlightIdOrderByTimestampAsc(flightId, PageRequest.of(0, pageLimit));
        }
        return blackboxMapper.toVmList(list);
    }
}