import React from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MetricCard from '../components/MetricCard';
import AlertPanel from '../components/AlertPanel';
import IncidentTable from '../components/IncidentTable';
import CameraGrid from '../components/CameraGrid';
import AnalyticsCharts from '../components/AnalyticsCharts';
import { sampleCameras, initialAlerts, mockAnalytics } from '../mock/dashboardData';
import { Camera, Users, AlertTriangle, Activity } from 'lucide-react';
import { HeatmapPanel } from '../components/HeatmapPanel';
import DashboardPanel from '../components/DashboardPanel';
import { UploadPanel } from '../components/UploadPanel';
import { useState } from 'react';
import { uploadVideo } from '../services/api';

export default function VisualDashboard() {
  const analytics = mockAnalytics();
  const alerts = initialAlerts;
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('Choose a CCTV recording to start analysis.');
  const [uploading, setUploading] = useState<boolean>(false);

  async function handleUpload() {
    if (!selectedFile) {
      setUploadMessage('Select a video file first.');
      return;
    }

    setUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(5);
    setUploadMessage('Uploading video to backend...');

    try {
      const resp = await uploadVideo(selectedFile, (pct) => {
        setUploadProgress(pct);
      });

      setUploadStatus(resp?.status ?? 'queued');
      setUploadMessage('Video queued for AI processing.');

      // if server reports completion immediately, reflect it
      if (resp?.status === 'completed') {
        setUploadProgress(100);
        setUploadStatus('completed');
        setUploadMessage('Processing complete');
      }
      setUploading(false);
    } catch (err) {
      setUploadStatus('error');
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.08),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent_28%),linear-gradient(180deg,#07111f_0%,#081420_45%,#050b14_100%)] text-slate-100">
      <div className="mx-auto max-w-[1680px]">
        <div className="grid grid-cols-12 gap-6 p-6">
          <div className="col-span-1">
            <Sidebar />
          </div>

          <div className="col-span-11 space-y-4">
            <Navbar />

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8">
                {/* Upload panel at top */}
                <div className="mb-4">
                  <DashboardPanel title="Upload Video" description="Submit CCTV footage for analysis" badge={<span className="text-sm">Manual</span>}>
                    <UploadPanel
                      fileName={selectedFile?.name ?? null}
                      status={uploadStatus}
                      progress={uploadProgress}
                      message={uploadMessage}
                      loading={uploading}
                      onPickFile={setSelectedFile}
                      onUpload={handleUpload}
                    />
                  </DashboardPanel>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <MetricCard title="Live Cameras" value={sampleCameras.length} icon={Camera} />
                  <MetricCard title="Active Alerts" value={alerts.length} icon={AlertTriangle} accent="text-rose-300" />
                  <MetricCard title="People Count" value={analytics.people_count} icon={Users} accent="text-green-300" />
                  <MetricCard title="Density" value={`${Math.round(analytics.density * 100)}%`} icon={Activity} accent="text-amber-300" />
                </div>

                <div className="mt-4 grid grid-cols-12 gap-4">
                  <div className="col-span-5">
                    <AlertPanel alerts={alerts} />
                  </div>
                  <div className="col-span-7">
                    <DashboardPanel title="Incident History" description="Grouped incidents with lifecycle" badge={<span className="text-sm">Live</span>}>
                      <IncidentTable incidents={alerts} />
                    </DashboardPanel>
                  </div>
                </div>

                <div className="mt-4">
                  <CameraGrid cameras={sampleCameras} />
                </div>
              </div>

              <div className="col-span-4 space-y-4">
                <DashboardPanel title="Analytics" description="Realtime insights" badge={<span className="text-sm">Live</span>}>
                  <AnalyticsCharts analytics={analytics} />
                </DashboardPanel>

                <DashboardPanel title="Heatmap - Store Floor" description="Live crowd intensity" badge={<span className="text-sm">Live</span>}>
                  <HeatmapPanel peopleCount={analytics.people_count} density={analytics.density} />
                </DashboardPanel>


                <DashboardPanel title="AI Pipeline Status" description="Realtime processing pipeline" badge={<span className="text-sm">System</span>}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/6 p-3">Camera Feed • {sampleCameras.length}</div>
                    <div className="rounded-xl border border-white/6 p-3">YOLOv8 • Detection</div>
                    <div className="rounded-xl border border-white/6 p-3">Tracking • ByteTrack</div>
                    <div className="rounded-xl border border-white/6 p-3">WebSocket • Streaming</div>
                  </div>
                </DashboardPanel>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
