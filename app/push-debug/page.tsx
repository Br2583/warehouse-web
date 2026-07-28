'use client';

import { useEffect, useState } from 'react';
import { pb } from '@/lib/pb';

export default function PushDebugPage() {
  const [log, setLog] = useState<string[]>(['Iniciando diagnóstico...']);
  const [done, setDone] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  useEffect(() => {
    const run = async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        addLog(`isNativePlatform: ${Capacitor.isNativePlatform()}`);
        addLog(`platform: ${Capacitor.getPlatform()}`);

        if (!Capacitor.isNativePlatform()) {
          addLog('⚠️ No es plataforma nativa — corre esto desde el APK, no el browser');
          setDone(true);
          return;
        }

        const { PushNotifications } = await import('@capacitor/push-notifications');
        addLog('✅ PushNotifications plugin cargado');

        const permStatus = await PushNotifications.requestPermissions();
        addLog(`permStatus.receive: ${permStatus.receive}`);

        if (permStatus.receive !== 'granted') {
          addLog('❌ Permiso NO concedido — actívalo en Ajustes > Apps > Warehouse Manager > Notificaciones');
          setDone(true);
          return;
        }

        addLog('✅ Permiso concedido, llamando register()...');
        await PushNotifications.register();
        addLog('register() llamado — esperando token FCM...');

        PushNotifications.addListener('registration', async (token) => {
          addLog(`✅ Token FCM recibido: ${token.value.slice(0, 30)}...`);
          localStorage.setItem('pending_fcm_token', token.value);
          localStorage.setItem('pending_fcm_platform', 'android');

          const authToken = pb.authStore.token;
          addLog(`pb.authStore.token: ${authToken ? '✅ existe' : '❌ vacío (no logueado)'}`);

          if (authToken) {
            const res = await fetch('/api/notifications/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
              body: JSON.stringify({ token: token.value, platform: 'android' }),
            });
            addLog(`Guardado en backend: ${res.ok ? '✅ OK' : '❌ status ' + res.status}`);
          } else {
            addLog('ℹ️ Token guardado en localStorage, se enviará al loguearse');
          }
          setDone(true);
        });

        PushNotifications.addListener('registrationError', (err) => {
          addLog(`❌ registrationError: ${JSON.stringify(err)}`);
          setDone(true);
        });

        // Timeout si no llega nada en 10s
        setTimeout(() => {
          addLog('⏱️ Timeout 10s — FCM no respondió');
          setDone(true);
        }, 10000);

      } catch (e: any) {
        addLog(`❌ Excepción: ${e?.message || String(e)}`);
        setDone(true);
      }
    };
    run();
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 13, background: '#0f0f0f', color: '#eee', minHeight: '100vh' }}>
      <h2 style={{ color: '#60a5fa', marginBottom: 16 }}>Push Notification Debug</h2>
      {log.map((line, i) => (
        <div key={i} style={{ marginBottom: 6, borderLeft: '2px solid #333', paddingLeft: 10 }}>
          {line}
        </div>
      ))}
      {done && (
        <div style={{ marginTop: 20, color: '#4ade80' }}>— Diagnóstico completo —</div>
      )}
    </div>
  );
}
