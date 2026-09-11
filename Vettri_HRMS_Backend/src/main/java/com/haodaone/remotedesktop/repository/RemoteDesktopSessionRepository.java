package com.haodaone.remotedesktop.repository;

import com.haodaone.remotedesktop.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface RemoteDesktopSessionRepository extends JpaRepository<RemoteDesktopSession, UUID> {
    Optional<RemoteDesktopSession> findByIdAndCompany_IdAndDevice_IdAndDeletedFalse(Long id, Long companyId, Long deviceId);
    List<RemoteDesktopSession> findByDevice_IdAndStatusInAndDeletedFalse(Long deviceId, List<RemoteDesktopStatus> statuses);
    Optional<RemoteDesktopSession> findByIdAndDevice_IdAndDeletedFalse(Long id, Long deviceId);
}