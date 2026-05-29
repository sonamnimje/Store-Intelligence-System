import { Activity, ArrowUpRight, Camera, CircleDot, Flame, Gauge, ShieldAlert } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertsPanel } from '../components/AlertsPanel';
import { CameraMonitor } from '../components/CameraMonitor';
import { DemoFramePanel } from '../components/DemoFramePanel';
import { EventTimeline } from '../components/EventTimeline';
import { HeatmapPanel } from '../components/HeatmapPanel';
import { StatCard } from '../components/StatCard';
import { UploadPanel } from '../components/UploadPanel';
import type { AlertItem, AnalyticsResponse, CameraStatusItem, EventItem } from '../types/api';

export type ToastItem = {
	id: string;
	title: string;
	message: string;
	tone: 'success' | 'info' | 'warning' | 'danger';
};

export type DashboardPageProps = {
	apiBase: string;
	analytics: AnalyticsResponse | null;
	alerts: AlertItem[];
	cameras: CameraStatusItem[];
	events: EventItem[];
	isLoading: boolean;
	isRefreshing: boolean;
	uploadStatus: string;
	uploadProgress: number;
	uploadMessage: string;
	selectedFile: File | null;
	trendData: AnalyticsResponse['trends'];
	toasts: ToastItem[];
	onPickFile: (file: File | null) => void;
	onUpload: () => void;
	onRefresh: () => void;
};

export function DashboardPage({
	apiBase,
	analytics,
	alerts,
	cameras,
	events,
	isLoading,
	isRefreshing,
	uploadStatus,
	uploadProgress,
	uploadMessage,
	selectedFile,
	trendData,
	toasts,
	onPickFile,
	onUpload,
	onRefresh,
}: DashboardPageProps) {
	const liveCameras = cameras.filter((camera) => camera.live).length;
	const peopleCount = analytics?.people_count ?? 0;
	const densityPercent = Math.round((analytics?.density ?? 0) * 100);
	const alertRate = analytics?.alerts ?? alerts.length;

	return (
		<div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#07111f_0%,#081420_45%,#050b14_100%)] text-slate-100">
			<div className="absolute inset-0 bg-grid bg-[size:28px_28px] opacity-[0.16] pointer-events-none" />
			<div className="absolute left-[-6rem] top-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
			<div className="absolute right-[-5rem] top-56 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />

			<div className="pointer-events-none fixed right-4 top-4 z-50 space-y-3">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className={`pointer-events-auto animate-pop-in rounded-2xl border px-4 py-3 shadow-glow backdrop-blur ${
							toast.tone === 'success'
								? 'border-emerald-400/30 bg-emerald-400/10'
								: toast.tone === 'warning'
									? 'border-amber-400/30 bg-amber-400/10'
									: toast.tone === 'danger'
										? 'border-rose-400/30 bg-rose-400/10'
										: 'border-sky-400/30 bg-sky-400/10'
						}`}
					>
						<p className="text-sm font-semibold text-slate-100">{toast.title}</p>
						<p className="text-sm text-slate-300">{toast.message}</p>
					</div>
				))}
			</div>

			<main className="relative mx-auto flex min-h-screen max-w-[1680px] flex-col gap-6 p-4 md:p-8 xl:p-10">
				<section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(9,18,33,0.92),rgba(13,23,41,0.82))] shadow-glow backdrop-blur">
					<div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
						<div className="relative overflow-hidden p-6 md:p-8 xl:p-10">
							<div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
							<div className="relative flex flex-col gap-6">
								<div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.35em] text-cyan-300/80">
									<span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1">Live surveillance intelligence</span>
									<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">FastAPI + React</span>
									<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">YOLOv8 + tracking</span>
								</div>

								<div className="max-w-3xl space-y-4">
									<h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">
										Store Intelligence Dashboard
										<span className="block bg-gradient-to-r from-cyan-200 via-sky-200 to-emerald-200 bg-clip-text text-transparent">real-time alerts, analytics, and camera health.</span>
									</h1>
									<p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
										Track active incidents, review grouped event history, and monitor camera streams from a single operational view. The page is tuned for fast CCTV workflows with live WebSocket updates and deduplicated incidents.
									</p>
								</div>

								<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
									{[
										{ label: 'Live cameras', value: liveCameras.toString(), icon: Camera },
										{ label: 'Active alerts', value: alerts.length.toString(), icon: ShieldAlert },
										{ label: 'People count', value: peopleCount.toString(), icon: Gauge },
										{ label: 'Density', value: `${densityPercent}%`, icon: Flame },
									].map((item) => (
										<div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-sm backdrop-blur">
											<div className="flex items-center justify-between gap-4">
												<div>
													<p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
													<p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
												</div>
												<item.icon className="h-6 w-6 text-cyan-300" />
											</div>
										</div>
									))}
								</div>
							</div>
						</div>

						<div className="border-t border-white/10 bg-slate-950/40 p-6 md:p-8 xl:border-l xl:border-t-0 xl:p-10">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="text-xs uppercase tracking-[0.3em] text-slate-500">System pulse</p>
									<h2 className="mt-2 text-2xl font-semibold text-white">Operational summary</h2>
								</div>
								<span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${isRefreshing ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'}`}>
									{isRefreshing ? 'Refreshing' : 'Live'}
								</span>
							</div>

							<div className="mt-6 grid gap-3 sm:grid-cols-3">
								{[
									{ label: 'Alerts/sec', value: alertRate.toString(), tone: 'cyan' },
									{ label: 'Feed mode', value: uploadStatus, tone: 'emerald' },
									{ label: 'WS', value: 'connected', tone: 'sky' },
								].map((item) => (
									<div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
										<p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
										<p className={`mt-2 text-lg font-semibold ${item.tone === 'cyan' ? 'text-cyan-200' : item.tone === 'emerald' ? 'text-emerald-200' : 'text-sky-200'}`}>{item.value}</p>
									</div>
								))}
							</div>

							<div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
								<div className="flex items-center justify-between gap-3 text-sm text-slate-300">
									<span>{uploadMessage}</span>
									<span className="uppercase tracking-[0.22em] text-slate-500">{uploadStatus}</span>
								</div>
								<div className="mt-3 h-2 rounded-full bg-white/5">
									<div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500" style={{ width: `${Math.min(100, uploadProgress)}%` }} />
								</div>
							</div>

							<div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-400">
								<div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Latest 10 alerts</div>
								<div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Grouped events</div>
								<div className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Cooldown enforced</div>
							</div>

							<div className="mt-6 flex flex-wrap gap-3">
								<button onClick={onRefresh} className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/15">
									Refresh data
								</button>
								<button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20">
									Review events
								</button>
							</div>
						</div>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
					<StatCard title="People Count" value={peopleCount} icon={Gauge} accent="text-cyan-300" description="Live tracked people" />
					<StatCard title="Active Alerts" value={alerts.length} icon={ShieldAlert} accent="text-rose-300" description="Streaming notifications" />
					<StatCard title="Density" value={`${densityPercent}%`} icon={Flame} accent="text-amber-300" description="Customer density signal" />
					<StatCard title="Camera Status" value={liveCameras} icon={Camera} accent="text-emerald-300" description="Online feeds" />
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
					<div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
						<div className="mb-5 flex items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold">Analytics Trend</h2>
								<p className="text-sm text-slate-400">Grouped incidents and flow signals</p>
							</div>
							<div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
								<Activity className="h-4 w-4 text-cyan-300" /> Live
							</div>
						</div>
						<TrendChart data={trendData} loading={isLoading} />
					</div>

					<AlertsPanel alerts={alerts} loading={isLoading} />
				</section>

				<section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
					<div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
						<div className="mb-5 flex items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold">Event History</h2>
								<p className="text-sm text-slate-400">Grouped lifecycle events with track-aware summaries</p>
							</div>
							<div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
								<CircleDot className="h-4 w-4 text-emerald-300" /> Deduped
							</div>
						</div>
						<EventTimeline events={events} loading={isLoading} />
					</div>

					<div className="space-y-4">
						<div className="rounded-3xl border border-white/10 bg-panel/90 p-5 shadow-glow">
							<div className="flex items-center justify-between gap-3">
								<div>
									<h2 className="text-lg font-semibold">Upload Control</h2>
									<p className="text-sm text-slate-400">Queue and monitor new footage</p>
								</div>
								<ArrowUpRight className="h-5 w-5 text-cyan-300" />
							</div>
							<div className="mt-4">
								<UploadPanel
									fileName={selectedFile?.name ?? null}
									status={uploadStatus}
									progress={uploadProgress}
									message={uploadMessage}
									loading={isLoading}
									onPickFile={onPickFile}
									onUpload={onUpload}
								/>
							</div>
						</div>
						<CameraMonitor cameras={cameras} loading={isLoading} />
						<HeatmapPanel peopleCount={peopleCount} density={analytics?.density ?? 0} />
						<DemoFramePanel apiBase={apiBase} />
					</div>
				</section>
			</main>
		</div>
	);
}

function TrendChart({ data, loading }: { data: AnalyticsResponse['trends']; loading: boolean }) {
	if (loading) {
		return <div className="flex h-72 animate-pulse items-center justify-center rounded-2xl border border-white/5 bg-slate-950/40 text-sm text-slate-500">Loading analytics chart...</div>;
	}

	if (!data.length) {
		return <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 text-sm text-slate-500">No trend data yet.</div>;
	}

	return (
		<div className="h-72 rounded-2xl border border-white/5 bg-slate-950/40 p-3">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data}>
					<defs>
						<linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor="#38bdf8" stopOpacity={0.45} />
							<stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
						</linearGradient>
					</defs>
					<XAxis dataKey="label" stroke="#64748b" tickLine={false} axisLine={false} />
					<YAxis stroke="#64748b" tickLine={false} axisLine={false} />
					<Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 16 }} />
					<Area dataKey="value" stroke="#38bdf8" fill="url(#trendFill)" strokeWidth={2} />
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}

export default DashboardPage;