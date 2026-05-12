/**
 * BarTalk v8 — ProgressTimeline Component
 * Timeline component for pronunciation progress tracking with visualization.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { getRecordingsForCourse, getProgressData } from '../../lib/audioStorage';
import type { AudioRecording, ProgressData } from '../../lib/audioStorage';

interface ProgressTimelineProps {
  courseId: string;
  onClose: () => void;
}

export function ProgressTimeline({ courseId, onClose }: ProgressTimelineProps) {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSessionDate, setExpandedSessionDate] = useState<string | null>(null);
  const [playingRecordingId, setPlayingRecordingId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioUrlsRef = useRef<Map<string, string>>(new Map());

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [recs, prog] = await Promise.all([
          getRecordingsForCourse(courseId),
          getProgressData(courseId),
        ]);
        setRecordings(recs);
        setProgressData(prog);
      } catch (error) {
        console.error('Failed to load pronunciation progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  // Draw chart on progress data change
  useEffect(() => {
    if (progressData.length > 0 && canvasRef.current) {
      drawChart(canvasRef.current, progressData);
    }
  }, [progressData]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      audioUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      audioUrlsRef.current.clear();
    };
  }, []);

  const drawChart = (canvas: HTMLCanvasElement, data: ProgressData[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const width = canvas.width - padding * 2;
    const height = canvas.height - padding * 2;

    // Clear canvas
    ctx.fillStyle = 'var(--bg-secondary, #111)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (data.length === 0) return;

    // Calculate scales
    const maxScore = Math.max(...data.map((d) => d.avgScore), 100);
    const scaleX = width / (data.length - 1 || 1);
    const scaleY = height / maxScore;

    // Draw grid lines
    ctx.strokeStyle = 'var(--bg-tertiary, #222)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }

    // Draw line chart
    ctx.strokeStyle = '#e879f9';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, idx) => {
      const x = padding + idx * scaleX;
      const y = padding + height - point.avgScore * scaleY;

      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw data points
    ctx.fillStyle = '#e879f9';
    data.forEach((point, idx) => {
      const x = padding + idx * scaleX;
      const y = padding + height - point.avgScore * scaleY;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw axes labels
    ctx.fillStyle = 'var(--text-secondary, #999)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    // X-axis labels (first, middle, last)
    if (data.length > 0) {
      ctx.fillText(data[0].date, padding, canvas.height - padding + 20);
    }
    if (data.length > 2) {
      const midIdx = Math.floor(data.length / 2);
      ctx.fillText(data[midIdx].date, padding + (width / 2), canvas.height - padding + 20);
    }
    if (data.length > 1) {
      ctx.fillText(data[data.length - 1].date, canvas.width - padding, canvas.height - padding + 20);
    }

    // Y-axis label
    ctx.textAlign = 'right';
    ctx.fillText('100', padding - 10, padding + 4);
    ctx.fillText('0', padding - 10, canvas.height - padding + 4);
  };

  const groupRecordingsByDate = useCallback(() => {
    const grouped = new Map<string, AudioRecording[]>();
    recordings.forEach((rec) => {
      const date = new Date(rec.timestamp).toISOString().split('T')[0];
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(rec);
    });
    return Array.from(grouped.entries())
      .map(([date, recs]) => ({
        date,
        recordings: recs.sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [recordings]);

  const getAudioUrl = useCallback((recording: AudioRecording): string => {
    if (!audioUrlsRef.current.has(recording.id)) {
      audioUrlsRef.current.set(recording.id, URL.createObjectURL(recording.blob));
    }
    return audioUrlsRef.current.get(recording.id)!;
  }, []);

  const handlePlayRecording = useCallback((recordingId: string) => {
    setPlayingRecordingId(playingRecordingId === recordingId ? null : recordingId);
  }, [playingRecordingId]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const sessionGroups = groupRecordingsByDate();

  if (isLoading) {
    return (
      <div className="progress-timeline">
        <div className="progress-header">
          <h2>Progressi Pronuncia</h2>
          <button className="progress-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary, #999)' }}>
          Caricamento in corso...
        </div>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="progress-timeline">
        <div className="progress-header">
          <h2>Progressi Pronuncia</h2>
          <button className="progress-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="progress-empty">Nessun esercizio di pronuncia registrato</div>
      </div>
    );
  }

  return (
    <div className="progress-timeline">
      {/* Header */}
      <div className="progress-header">
        <h2>Progressi Pronuncia</h2>
        <button className="progress-close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Chart */}
      <div className="progress-chart-container">
        <canvas
          ref={canvasRef}
          className="progress-chart"
          width={600}
          height={200}
          style={{ width: '100%', height: 'auto' }}
        />
      </div>

      {/* Timeline */}
      <div className="progress-timeline-entries">
        {sessionGroups.map(({ date, recordings: sessionRecordings }) => {
          const avgScore =
            sessionRecordings.reduce((sum, r) => sum + (r.pronunciationScore || 0), 0) /
              sessionRecordings.length || 0;
          const isExpanded = expandedSessionDate === date;

          return (
            <div key={date} className="progress-entry">
              {/* Session header */}
              <button
                className={`progress-entry-header ${isExpanded ? 'progress-entry-expanded' : ''}`}
                onClick={() => setExpandedSessionDate(isExpanded ? null : date)}
              >
                <span className="progress-entry-date">{formatDate(date)}</span>
                <span
                  className="progress-entry-score-badge"
                  style={{ backgroundColor: getScoreBadgeColor(avgScore) }}
                >
                  {avgScore.toFixed(0)}%
                </span>
                <span className="progress-entry-count">{sessionRecordings.length} esercizi</span>
                <span className="progress-entry-toggle">{isExpanded ? '▼' : '▶'}</span>
              </button>

              {/* Expandable recordings list */}
              {isExpanded && (
                <div className="progress-entry-content">
                  {sessionRecordings.map((recording) => {
                    const isPlaying = playingRecordingId === recording.id;
                    const score = recording.pronunciationScore || 0;

                    return (
                      <div key={recording.id} className="progress-recording">
                        <div className="progress-recording-header">
                          <button
                            className="progress-recording-play-btn"
                            onClick={() => handlePlayRecording(recording.id)}
                            title={isPlaying ? 'Pause' : 'Play'}
                          >
                            {isPlaying ? '⏸️' : '▶️'}
                          </button>
                          <span className="progress-recording-time">{formatTime(recording.timestamp)}</span>
                          <span
                            className="progress-recording-score"
                            style={{ backgroundColor: getScoreBadgeColor(score) }}
                          >
                            {score.toFixed(0)}%
                          </span>
                          <span className="progress-recording-duration">{recording.duration.toFixed(1)}s</span>
                        </div>

                        {/* Audio player */}
                        {isPlaying && (
                          <div className="progress-recording-player">
                            <audio
                              key={recording.id}
                              controls
                              autoPlay
                              onEnded={() => setPlayingRecordingId(null)}
                              style={{ width: '100%' }}
                            >
                              <source src={getAudioUrl(recording)} type="audio/wav" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}

                        {/* Transcripts */}
                        {(recording.transcript || recording.expectedText) && (
                          <div className="progress-recording-details">
                            {recording.transcript && (
                              <div className="progress-recording-field">
                                <label>Tuo:</label>
                                <p>{recording.transcript}</p>
                              </div>
                            )}
                            {recording.expectedText && (
                              <div className="progress-recording-field">
                                <label>Previsto:</label>
                                <p>{recording.expectedText}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
