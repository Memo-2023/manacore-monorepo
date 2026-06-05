import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageHooks } from './hooks';
import { InMemoryMetrics, attachMetrics, createPrometheusCollector } from './metrics';
import type { MetricsFactory } from './metrics';

describe('InMemoryMetrics', () => {
	let metrics: InMemoryMetrics;

	beforeEach(() => {
		metrics = new InMemoryMetrics();
	});

	it('tracks upload count', () => {
		metrics.incrementUploads('test-bucket');
		metrics.incrementUploads('test-bucket');
		expect(metrics.counters.uploads).toBe(2);
	});

	it('tracks upload errors', () => {
		metrics.incrementUploadErrors('test-bucket');
		expect(metrics.counters.uploadErrors).toBe(1);
	});

	it('tracks deletes with count', () => {
		metrics.incrementDeletes('test-bucket', 5);
		expect(metrics.counters.deletes).toBe(5);
	});

	it('tracks downloads', () => {
		metrics.incrementDownloads('test-bucket');
		expect(metrics.counters.downloads).toBe(1);
	});

	it('records upload sizes', () => {
		metrics.observeUploadSize('test-bucket', 1024);
		metrics.observeUploadSize('test-bucket', 2048);
		expect(metrics.sizes).toEqual([1024, 2048]);
	});

	it('resets all counters', () => {
		metrics.incrementUploads('b');
		metrics.incrementUploadErrors('b');
		metrics.incrementDeletes('b', 3);
		metrics.incrementDownloads('b');
		metrics.observeUploadSize('b', 100);
		metrics.reset();

		expect(metrics.counters.uploads).toBe(0);
		expect(metrics.counters.uploadErrors).toBe(0);
		expect(metrics.counters.deletes).toBe(0);
		expect(metrics.counters.downloads).toBe(0);
		expect(metrics.sizes).toEqual([]);
	});
});

describe('attachMetrics', () => {
	let hooks: StorageHooks;
	let metrics: InMemoryMetrics;

	beforeEach(() => {
		hooks = new StorageHooks();
		metrics = new InMemoryMetrics();
		attachMetrics(hooks, metrics);
	});

	it('tracks uploads via hooks', () => {
		hooks.emit('upload', {
			bucket: 'test',
			key: 'file.png',
			sizeBytes: 512,
			contentType: 'image/png',
		});

		expect(metrics.counters.uploads).toBe(1);
		expect(metrics.sizes).toEqual([512]);
	});

	it('tracks upload errors via hooks', () => {
		hooks.emit('upload:error', {
			bucket: 'test',
			error: new Error('fail'),
		});

		expect(metrics.counters.uploadErrors).toBe(1);
	});

	it('tracks deletes via hooks', () => {
		hooks.emit('delete', {
			bucket: 'test',
			keys: ['a.png', 'b.png'],
		});

		expect(metrics.counters.deletes).toBe(2);
	});

	it('tracks downloads via hooks', () => {
		hooks.emit('download', { bucket: 'test', key: 'file.png' });

		expect(metrics.counters.downloads).toBe(1);
	});

	it('returns detach function', () => {
		const detach = attachMetrics(new StorageHooks(), metrics);
		// No-op on hooks that were attached separately — just verify it doesn't throw
		detach();
	});

	it('skips size tracking when sizeBytes is undefined', () => {
		hooks.emit('upload', { bucket: 'test', key: 'file.png' });

		expect(metrics.counters.uploads).toBe(1);
		expect(metrics.sizes).toEqual([]);
	});
});

describe('createPrometheusCollector', () => {
	function createMockFactory(): MetricsFactory & {
		counters: Map<string, { inc: ReturnType<typeof vi.fn> }>;
		histograms: Map<string, { observe: ReturnType<typeof vi.fn> }>;
	} {
		const counters = new Map<string, { inc: ReturnType<typeof vi.fn> }>();
		const histograms = new Map<string, { observe: ReturnType<typeof vi.fn> }>();

		return {
			counters,
			histograms,
			createCounter(name: string) {
				const counter = { inc: vi.fn() };
				counters.set(name, counter);
				return counter;
			},
			createHistogram(name: string) {
				const histogram = { observe: vi.fn() };
				histograms.set(name, histogram);
				return histogram;
			},
		};
	}

	it('creates expected metrics', () => {
		const factory = createMockFactory();
		createPrometheusCollector(factory);

		expect(factory.counters.has('storage_uploads_total')).toBe(true);
		expect(factory.counters.has('storage_upload_errors_total')).toBe(true);
		expect(factory.counters.has('storage_deletes_total')).toBe(true);
		expect(factory.counters.has('storage_downloads_total')).toBe(true);
		expect(factory.histograms.has('storage_upload_size_bytes')).toBe(true);
	});

	it('increments upload counter with labels', () => {
		const factory = createMockFactory();
		const collector = createPrometheusCollector(factory);

		collector.incrementUploads('picture-storage', 'image/png');

		const counter = factory.counters.get('storage_uploads_total');
		expect(counter?.inc).toHaveBeenCalledWith({
			bucket: 'picture-storage',
			content_type: 'image/png',
		});
	});

	it('uses "unknown" for missing content type', () => {
		const factory = createMockFactory();
		const collector = createPrometheusCollector(factory);

		collector.incrementUploads('chat-storage');

		const counter = factory.counters.get('storage_uploads_total');
		expect(counter?.inc).toHaveBeenCalledWith({
			bucket: 'chat-storage',
			content_type: 'unknown',
		});
	});

	it('observes upload size in histogram', () => {
		const factory = createMockFactory();
		const collector = createPrometheusCollector(factory);

		collector.observeUploadSize('picture-storage', 1048576);

		const histogram = factory.histograms.get('storage_upload_size_bytes');
		expect(histogram?.observe).toHaveBeenCalledWith({ bucket: 'picture-storage' }, 1048576);
	});

	it('increments deletes with count', () => {
		const factory = createMockFactory();
		const collector = createPrometheusCollector(factory);

		collector.incrementDeletes('chat-storage', 5);

		const counter = factory.counters.get('storage_deletes_total');
		expect(counter?.inc).toHaveBeenCalledWith({ bucket: 'chat-storage' }, 5);
	});

	it('works end-to-end with hooks', () => {
		const factory = createMockFactory();
		const collector = createPrometheusCollector(factory);
		const hooks = new StorageHooks();
		attachMetrics(hooks, collector);

		hooks.emit('upload', {
			bucket: 'test',
			key: 'f.png',
			sizeBytes: 512,
			contentType: 'image/png',
		});
		hooks.emit('download', { bucket: 'test', key: 'f.png' });
		hooks.emit('delete', { bucket: 'test', keys: ['a', 'b'] });

		expect(factory.counters.get('storage_uploads_total')?.inc).toHaveBeenCalledTimes(1);
		expect(factory.counters.get('storage_downloads_total')?.inc).toHaveBeenCalledTimes(1);
		expect(factory.counters.get('storage_deletes_total')?.inc).toHaveBeenCalledWith(
			{ bucket: 'test' },
			2
		);
		expect(factory.histograms.get('storage_upload_size_bytes')?.observe).toHaveBeenCalledWith(
			{ bucket: 'test' },
			512
		);
	});
});
