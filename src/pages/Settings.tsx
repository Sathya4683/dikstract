import React, { useState, useEffect } from 'react';
import {
  getConfig,
  saveConfig,
  getVideo,
  saveVideo,
  deleteVideo,
  validateVideo,
  type VideoData,
} from '../db/indexeddb';

const Settings: React.FC = () => {
  const [blockedDomains, setBlockedDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const config = await getConfig();
    setBlockedDomains(config.blockedDomains);
    const video = await getVideo();
    setVideoData(video);
  };

  const showMessage = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddDomain = async () => {
    const clean = newDomain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    if (!clean) return;
    if (blockedDomains.includes(clean)) {
      showMessage('domain already added');
      return;
    }

    const updated = [...blockedDomains, clean];
    await saveConfig({ blockedDomains: updated });
    setBlockedDomains(updated);
    setNewDomain('');
  };

  const handleRemoveDomain = async (domain: string) => {
    const updated = blockedDomains.filter(d => d !== domain);
    await saveConfig({ blockedDomains: updated });
    setBlockedDomains(updated);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = await validateVideo(file);
    if (!validation.valid) {
      showMessage(validation.error || 'invalid video');
      e.target.value = '';
      return;
    }

    await saveVideo({
      blob: file,
      size: file.size,
      duration: validation.duration || 0,
    });

    setVideoData({
      blob: file,
      size: file.size,
      duration: validation.duration || 0,
    });

    e.target.value = '';
  };

  const handleRemoveVideo = async () => {
    await deleteVideo();
    setVideoData(null);
  };

  const formatSize = (bytes: number) => {
    return bytes < 1024 * 1024
      ? (bytes / 1024).toFixed(1) + ' KB'
      : (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="section">
      <h2 className="section-title">blocked domains</h2>

      <div className="row">
        <input
          type="text"
          placeholder="example.com"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
        />
        <button onClick={handleAddDomain}>add</button>
      </div>

      <div className="list">
        {blockedDomains.map(domain => (
          <div key={domain} className="list-item">
            <span>{domain}</span>
            <button onClick={() => handleRemoveDomain(domain)}>x</button>
          </div>
        ))}
      </div>

      <div className="divider" />

      <h2 className="section-title">motivational video</h2>

      {videoData ? (
        <div className="video-meta">
          <p>size: {formatSize(videoData.size)}</p>
          <p>status: active</p>
          <button className="danger" onClick={handleRemoveVideo}>
            remove
          </button>
        </div>
      ) : (
        <div>
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={handleVideoUpload}
          />
          <p className="hint">max 20s | max 15mb</p>
        </div>
      )}

      {message && <div className="message">{message}</div>}
    </div>
  );
};

export default Settings;
