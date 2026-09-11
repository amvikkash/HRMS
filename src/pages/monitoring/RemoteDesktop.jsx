import { useEffect, useRef, useState } from 'react';
import { MonitorUp, Square, RefreshCw, Maximize, MousePointer2, Keyboard } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { monitoringApi, getDeviceName, isDeviceOnline } from '../../api/endpoints/monitoring';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import ErrorState from '../../components/ui/ErrorState';

export default function RemoteDesktop() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [session, setSession] = useState(null);
  const [frameUrl, setFrameUrl] = useState('');
  const [frameSize, setFrameSize] = useState(null);
  const [controlActive, setControlActive] = useState(false);
  const [webRtcConnected, setWebRtcConnected] = useState(false);
  const imageRef = useRef(null);
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const webRtcStartRef = useRef(null);
  const surfaceRef = useRef(null);
  const lastMoveRef = useRef(0);
  const deviceQuery = useQuery({ queryKey: ['monitoring-device', id], queryFn: () => monitoringApi.deviceById(id), refetchInterval: 15_000 });
  const sessionsQuery = useQuery({ queryKey: ['remote-desktop-sessions', id], queryFn: () => monitoringApi.remoteDesktopSessions(id), refetchInterval: 3000 });
  const sessionQuery = useQuery({ queryKey: ['remote-desktop-session', id, session?.sessionId], queryFn: () => monitoringApi.remoteDesktopSession(id, session.sessionId), enabled: Boolean(session?.sessionId), refetchInterval: 1500 });
  const frameQuery = useQuery({ queryKey: ['remote-desktop-frame', id, session?.sessionId], queryFn: () => monitoringApi.remoteDesktopFrame(id, session.sessionId), enabled: ['REQUESTED', 'CONNECTING', 'CONNECTED'].includes(session?.status) || ['REQUESTED', 'CONNECTING', 'CONNECTED'].includes(sessionQuery.data?.status), refetchInterval: 350, retry: false });
  const start = useMutation({ mutationFn: () => monitoringApi.startRemoteDesktop(id), onSuccess: setSession });
  const end = useMutation({ mutationFn: () => monitoringApi.endRemoteDesktop(id, session.sessionId), onSuccess: (value) => { setSession(value); setControlActive(false); queryClient.removeQueries({ queryKey: ['remote-desktop-frame', id] }); } });
  const sendInput = useMutation({ mutationFn: (input) => monitoringApi.remoteDesktopInput(id, session.sessionId, input) });
  const device = deviceQuery.data;
  const currentSession = sessionQuery.data || session;

  useEffect(() => {
    const signalingToken = session?.signalingToken;
    const sessionId = session?.sessionId;
    if (!signalingToken || !sessionId || !['REQUESTED', 'CONNECTING', 'CONNECTED'].includes(currentSession?.status) || webRtcStartRef.current === sessionId) return undefined;
    webRtcStartRef.current = sessionId;
    let stopped = false;
    const iceServers = (session.iceServers || []).map((server) => ({ urls: server.urls, username: server.username, credential: server.credential }));
    const peer = new RTCPeerConnection({ iceServers });
    peerRef.current = peer;
    peer.addTransceiver('video', { direction: 'recvonly' });
    peer.ontrack = (event) => {
      if (videoRef.current && event.streams[0]) {
        videoRef.current.srcObject = event.streams[0];
        videoRef.current.play().catch(() => {});
      }
    };
    peer.onconnectionstatechange = () => {
      const connected = peer.connectionState === 'connected';
      setWebRtcConnected(connected);
      if (peer.connectionState === 'failed') setWebRtcConnected(false);
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate || stopped) return;
      monitoringApi.remoteDesktopWebRtcIce(id, sessionId, signalingToken, {
        sessionId: String(sessionId), type: 'ICE', candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid, sdpMLineIndex: event.candidate.sdpMLineIndex,
      }).catch(() => {});
    };
    (async () => {
      try {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        await monitoringApi.remoteDesktopWebRtcOffer(id, sessionId, signalingToken, { sessionId: String(sessionId), type: 'OFFER', sdp: offer.sdp });
        while (!stopped) {
          const events = await monitoringApi.remoteDesktopWebRtcEvents(id, sessionId, signalingToken);
          for (const event of events || []) {
            if (event.type === 'ANSWER' && event.sdp && peer.signalingState !== 'stable') await peer.setRemoteDescription({ type: 'answer', sdp: event.sdp });
            if (event.type === 'ICE' && event.candidate) await peer.addIceCandidate({ candidate: event.candidate, sdpMid: event.sdpMid, sdpMLineIndex: event.sdpMLineIndex });
          }
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } catch (error) {
        console.warn('[RemoteDesktop] WebRTC unavailable; JPEG fallback remains active', error);
        setWebRtcConnected(false);
      }
    })();
    return () => {
      stopped = true;
      peer.close();
      peerRef.current = null;
      webRtcStartRef.current = null;
      setWebRtcConnected(false);
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [id, session?.sessionId, session?.signalingToken, currentSession?.status]);

  useEffect(() => { if (sessionQuery.data) setSession(sessionQuery.data); }, [sessionQuery.data]);
  useEffect(() => {
    if (session || !sessionsQuery.data?.length) return;
    const activeSession = sessionsQuery.data.find((item) => ['REQUESTED', 'CONNECTING', 'CONNECTED'].includes(item.status));
    if (activeSession) setSession(activeSession);
  }, [session, sessionsQuery.data]);
  useEffect(() => { if (frameQuery.data) { setFrameSize({ width: frameQuery.data.width, height: frameQuery.data.height }); console.info('[RemoteDesktop] first/live frame received', { deviceId: id, sessionId: session?.sessionId, bytes: frameQuery.data.blob.size }); } }, [frameQuery.data, id, session?.sessionId]);
  useEffect(() => {
    if (!frameQuery.data) return undefined;
    const url = URL.createObjectURL(frameQuery.data.blob);
    setFrameUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return url; });
    return () => URL.revokeObjectURL(url);
  }, [frameQuery.data]);
  useEffect(() => { if (!frameQuery.data) setFrameSize(null); }, [frameQuery.data]);
  useEffect(() => { if (controlActive) surfaceRef.current?.focus(); }, [controlActive]);
  useEffect(() => () => { if (frameUrl) URL.revokeObjectURL(frameUrl); }, [frameUrl]);

  function startSession() { if (isDeviceOnline(device)) start.mutate(); }
  const active = currentSession && ['REQUESTED', 'CONNECTING', 'CONNECTED'].includes(currentSession.status);
  useEffect(() => {
    if (!controlActive || !active) return undefined;
    const onKeyDown = (event) => handleKey(event);
    const onKeyUp = (event) => handleKey(event);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [controlActive, active]);
  function remotePoint(event) {
    const rect = imageRef.current?.getBoundingClientRect();
    if (!rect || !frameSize) return null;
    return { x: Math.max(0, Math.min(frameSize.width - 1, Math.round((event.clientX - rect.left) * frameSize.width / rect.width))), y: Math.max(0, Math.min(frameSize.height - 1, Math.round((event.clientY - rect.top) * frameSize.height / rect.height))) };
  }
  function mouseEvent(event, type, extra = {}) { if (!controlActive || !active) return; if (type === 'WHEEL' && !extra.delta) return; const point = remotePoint(event); if (point || type === 'WHEEL') sendInput.mutate({ type, ...(point || {}), ...extra }); }
  function handleMove(event) { if (!controlActive || !active || Date.now() - lastMoveRef.current < 100) return; lastMoveRef.current = Date.now(); const point = remotePoint(event); if (point) sendInput.mutate({ type: 'MOVE', ...point }); }
  function virtualKey(event) {
    const special = { Enter: 13, Backspace: 8, Tab: 9, Escape: 27, Shift: 16, Control: 17, Alt: 18, Meta: 91, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Delete: 46, Home: 36, End: 35, PageUp: 33, PageDown: 34, F1: 112, F2: 113, F3: 114, F4: 115, F5: 116, F6: 117, F7: 118, F8: 119, F9: 120, F10: 121, F11: 122, F12: 123, ' ': 32, Minus: 189, Equal: 187, BracketLeft: 219, BracketRight: 221, Backslash: 220, Semicolon: 186, Quote: 222, Comma: 188, Period: 190, Slash: 191, Backquote: 192 };
    if (special[event.key]) return special[event.key];
    if (special[event.code]) return special[event.code];
    if (/^[a-z]$/i.test(event.key)) return event.key.toUpperCase().charCodeAt(0);
    if (/^[0-9]$/.test(event.key)) return event.key.charCodeAt(0);
    return null;
  }
  function handleKey(event) { if (!controlActive || !active) return; const key = virtualKey(event); if (!key) return; event.preventDefault(); sendInput.mutate({ type: event.type === 'keydown' ? 'KEY_DOWN' : 'KEY_UP', virtualKey: key }); }

  return <div className="d-flex flex-column gap-4">
    <Link to={`/monitoring/devices/${id}`} className="text-decoration-none text-secondary-hz">← Back to device</Link>
    <Card>
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
        <div><div className="text-secondary-hz" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>REMOTE DESKTOP TARGET</div><h1 className="mb-1" style={{ fontSize: 'var(--hz-text-xl)' }}>{getDeviceName(device)}</h1><StatusBadge status={isDeviceOnline(device) ? 'ACTIVE' : 'INACTIVE'} variant={isDeviceOnline(device) ? 'success' : 'neutral'} dot>{isDeviceOnline(device) ? 'Online' : 'Offline'}</StatusBadge></div>
        <div className="text-secondary-hz" style={{ fontSize: 13 }}>Agent-connected screen sharing</div>
      </div>
    </Card>
    {deviceQuery.isError && <ErrorState description="Could not load this device." onRetry={deviceQuery.refetch} />}
    <Card title="Remote Desktop" subtitle="Use only for authorized support. Remote control is disabled until explicitly enabled.">
      <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3"><div>Status: <strong>{currentSession?.status || 'DISCONNECTED'}</strong>{controlActive && <span className="ms-2 text-danger fw-semibold">REMOTE CONTROL ACTIVE</span>}</div><div className="d-flex gap-2">{active && <Button size="sm" variant={controlActive ? 'danger' : 'secondary'} icon={controlActive ? MousePointer2 : Keyboard} onClick={() => setControlActive((value) => !value)}>{controlActive ? 'Disable control' : 'Enable control'}</Button>}{active && <Button size="sm" variant="secondary" icon={Maximize} onClick={() => surfaceRef.current?.requestFullscreen?.()}>Fullscreen</Button>}{!active && <Button icon={MonitorUp} onClick={startSession} loading={start.isPending} disabled={!isDeviceOnline(device)}>Start session</Button>}{active && <Button variant="danger" icon={Square} onClick={() => end.mutate()} loading={end.isPending}>End session</Button>}{currentSession?.status === 'FAILED' && <Button variant="secondary" icon={RefreshCw} onClick={startSession} disabled={!isDeviceOnline(device)}>Retry</Button>}</div></div>
      {start.isError && <p className="text-danger">{start.error?.response?.data?.message || 'Could not start the remote desktop session.'}</p>}
      {sendInput.isError && <p className="text-danger">Remote control event rejected: {sendInput.error?.response?.data?.message || 'check that the session is still active.'}</p>}
      {!isDeviceOnline(device) && <div className="hz-state"><p className="hz-state__title">Device Offline</p><p className="hz-state__description">The selected device is currently offline.</p></div>}
      {isDeviceOnline(device) && !frameUrl && !webRtcConnected && <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 430, background: '#111827', color: '#cbd5e1', borderRadius: 8 }}><span>{active ? 'Waiting for the client screen...' : 'Start a session to view the client screen.'}</span></div>}
      {webRtcConnected && <div ref={surfaceRef} tabIndex={-1} style={{ background: '#111827', borderRadius: 8, width: '100%', aspectRatio: '16 / 9', maxHeight: 'calc(100vh - 280px)', minHeight: 320, overflow: 'hidden' }}><video ref={videoRef} autoPlay playsInline muted style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} /></div>}
      {frameUrl && !webRtcConnected && <div ref={surfaceRef} tabIndex={controlActive ? 0 : -1} onMouseMove={handleMove} onMouseDown={(event) => mouseEvent(event, 'BUTTON_DOWN', { button: event.button === 2 ? 'RIGHT' : event.button === 1 ? 'MIDDLE' : 'LEFT' })} onMouseUp={(event) => mouseEvent(event, 'BUTTON_UP', { button: event.button === 2 ? 'RIGHT' : event.button === 1 ? 'MIDDLE' : 'LEFT' })} onContextMenu={(event) => event.preventDefault()} onWheel={(event) => mouseEvent(event, 'WHEEL', { delta: Math.round(-event.deltaY) })} style={{ background: '#111827', borderRadius: 8, width: '100%', aspectRatio: frameSize ? `${frameSize.width} / ${frameSize.height}` : '16 / 9', maxHeight: 'calc(100vh - 280px)', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', overscrollBehavior: 'contain', outline: 'none' }}><img ref={imageRef} src={frameUrl} alt={`Live desktop of ${getDeviceName(device)}`} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center', maxWidth: '100%', maxHeight: '100%', userSelect: 'none', pointerEvents: 'none' }} /></div>}
      {frameQuery.isError && active && <p className="text-secondary-hz mt-3 mb-0">Connecting to the selected agent...</p>}
    </Card>
  </div>;
}