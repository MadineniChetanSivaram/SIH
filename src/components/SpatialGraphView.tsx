/**
 * Spatial Memory & Topological Graph Visualizer
 * Renders the persistent spatial memory graph, habitual paths,
 * landmark nodes, relationships, and temporal difference markers.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  SpatialMemory, 
  SpatialNode, 
  SpatialPath, 
  EnvironmentalChange, 
  UserPose, 
  NodeCategory 
} from '../types';
import { 
  Layers, 
  Navigation, 
  Plus, 
  Trash2, 
  Info, 
  CheckCircle, 
  AlertTriangle, 
  MapPin, 
  DoorClosed, 
  Footprints, 
  SlidersHorizontal 
} from 'lucide-react';
import { audioSynth } from '../services/audioSpatialSynth';
import { speechService } from '../services/speechService';

interface SpatialGraphViewProps {
  memory: SpatialMemory;
  latestChanges: EnvironmentalChange[];
  userPose: UserPose;
  onSaveMemory: (updated: SpatialMemory) => void;
  highContrast: boolean;
}

export const SpatialGraphView: React.FC<SpatialGraphViewProps> = ({
  memory,
  latestChanges,
  userPose,
  onSaveMemory,
  highContrast,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedNode, setSelectedNode] = useState<SpatialNode | null>(null);
  const [isAddingNode, setIsAddingNode] = useState<boolean>(false);
  const [newNodeLabel, setNewNodeLabel] = useState<string>('');
  const [newNodeCategory, setNewNodeCategory] = useState<NodeCategory>('landmark');
  const [newNodeX, setNewNodeX] = useState<number>(0);
  const [newNodeY, setNewNodeY] = useState<number>(3);

  // Render 2D Spatial Map Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Coordinate conversion: Map origin (0,0) is centered horizontally, 40px from bottom
    const originX = width / 2;
    const originY = height - 60;
    const scale = 26; // pixels per meter

    // Clear background
    ctx.fillStyle = highContrast ? '#000000' : '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Draw Metric Grid lines (1 meter intervals)
    ctx.strokeStyle = highContrast ? '#222222' : '#172033';
    ctx.lineWidth = 1;
    for (let x = -10; x <= 10; x += 1) {
      const cx = originX + x * scale;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, height);
      ctx.stroke();
    }
    for (let y = 0; y <= 15; y += 1) {
      const cy = originY - y * scale;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(width, cy);
      ctx.stroke();
    }

    // Draw Habitual Paths (Dashed Corridor)
    memory.paths.forEach((path) => {
      if (path.waypoints.length < 2) return;

      // Draw Path Corridor Buffer
      ctx.strokeStyle = '#06b6d433'; // Cyan low opacity
      ctx.lineWidth = path.widthMeters * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      path.waypoints.forEach((wp, idx) => {
        const px = originX + wp.x * scale;
        const py = originY - wp.y * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      // Draw Path Centerline
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      path.waypoints.forEach((wp, idx) => {
        const px = originX + wp.x * scale;
        const py = originY - wp.y * scale;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Waypoints
      path.waypoints.forEach((wp, idx) => {
        const px = originX + wp.x * scale;
        const py = originY - wp.y * scale;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.fillText(wp.label || `WP ${idx + 1}`, px + 8, py - 6);
      });
    });

    // Draw Remembered Spatial Nodes (Landmarks, Furniture, Doors)
    memory.nodes.forEach((node) => {
      const nx = originX + node.position.x * scale;
      const ny = originY - node.position.y * scale;

      const isLandmark = node.category === 'landmark' || node.isPermanentLandmark;
      const isDoor = node.category === 'door' || node.category === 'entrance';
      const isStairs = node.category === 'staircase';

      ctx.fillStyle = isLandmark ? '#38bdf8' : isDoor ? '#a855f7' : isStairs ? '#f59e0b' : '#10b981';
      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(node.label, nx + 12, ny + 4);
    });

    // Draw Temporal Changes / Obstacles (Red / Amber Pulsing Dots)
    latestChanges.forEach((change) => {
      const isCritical = change.riskLevel === 'critical';
      // Calculate approximate position relative to origin
      const angleRad = ((change.clockDirection - 12) * 30 - 90) * (Math.PI / 180);
      const cx = originX + userPose.x * scale + change.distanceMeters * scale * Math.cos(angleRad);
      const cy = originY - userPose.y * scale + change.distanceMeters * scale * Math.sin(angleRad);

      ctx.fillStyle = isCritical ? '#f43f5e' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isCritical ? '#fecdd3' : '#fde68a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`⚠️ ${change.objectLabel}`, cx + 14, cy + 4);
    });

    // Draw Current User Position (Blue Pulsing Indicator with Heading Cone)
    const ux = originX + userPose.x * scale;
    const uy = originY - userPose.y * scale;

    // Heading cone
    const headingRad = (userPose.headingDegrees - 90) * (Math.PI / 180);
    ctx.fillStyle = '#06b6d422';
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.arc(ux, uy, 45, headingRad - 0.4, headingRad + 0.4);
    ctx.closePath();
    ctx.fill();

    // User dot
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(ux, uy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('YOU', ux + 12, uy + 4);

  }, [memory, latestChanges, userPose, highContrast]);

  const handleAddNodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeLabel.trim()) return;

    const newNode: SpatialNode = {
      id: `node-${Date.now()}`,
      environmentId: memory.environment.id,
      label: newNodeLabel.trim(),
      category: newNodeCategory,
      position: { x: Number(newNodeX), y: Number(newNodeY), z: 0 },
      confidence: 1.0,
      firstObservedAt: new Date().toISOString(),
      lastObservedAt: new Date().toISOString(),
      observationCount: 1,
      status: 'stable',
      persistenceScore: 1.0,
      isPermanentLandmark: newNodeCategory === 'landmark' || newNodeCategory === 'door' || newNodeCategory === 'staircase',
    };

    const updated: SpatialMemory = {
      ...memory,
      nodes: [...memory.nodes, newNode],
      lastUpdated: new Date().toISOString(),
    };

    onSaveMemory(updated);
    setNewNodeLabel('');
    setIsAddingNode(false);
    audioSynth.playStateChime('success');
    speechService.speak(`Added ${newNode.label} to spatial memory for ${memory.place.name}.`);
  };

  const handleDeleteNode = (nodeId: string) => {
    const node = memory.nodes.find(n => n.id === nodeId);
    const updated: SpatialMemory = {
      ...memory,
      nodes: memory.nodes.filter(n => n.id !== nodeId),
      lastUpdated: new Date().toISOString(),
    };
    onSaveMemory(updated);
    setSelectedNode(null);
    audioSynth.playClickSound();
    if (node) {
      speechService.speak(`Removed ${node.label} from spatial memory.`);
    }
  };

  return (
    <div id="spatial-graph-container" className="max-w-6xl mx-auto px-4 py-4 sm:py-6 flex flex-col gap-6">
      
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Spatial Memory Graph: {memory.place.name}</h2>
            <p className="text-xs text-slate-300">
              {memory.nodes.length} Learned Nodes • {memory.paths.length} Habitual Routes • {memory.observationsCount} Lifetime Visits
            </p>
          </div>
        </div>

        <button
          id="btn-add-landmark-trigger"
          onClick={() => {
            audioSynth.playClickSound();
            setIsAddingNode(!isAddingNode);
          }}
          className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>{isAddingNode ? 'Cancel' : 'Add Landmark'}</span>
        </button>
      </div>

      {/* Add Landmark Form Modal */}
      {isAddingNode && (
        <form 
          onSubmit={handleAddNodeSubmit}
          className="p-5 rounded-2xl bg-slate-950 border-2 border-cyan-500/50 flex flex-col gap-4 shadow-xl animate-fade-in"
        >
          <div className="font-extrabold text-sm text-cyan-300 uppercase tracking-wider">
            Record New Landmark / Feature
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300">Feature Label</label>
              <input
                type="text"
                value={newNodeLabel}
                onChange={e => setNewNodeLabel(e.target.value)}
                placeholder="e.g. Water Fountain, Room 102 Door"
                required
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Category</label>
              <select
                value={newNodeCategory}
                onChange={e => setNewNodeCategory(e.target.value as NodeCategory)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-400 focus:outline-none"
              >
                <option value="landmark">Permanent Landmark</option>
                <option value="door">Door / Entrance</option>
                <option value="staircase">Staircase</option>
                <option value="furniture">Furniture / Desk</option>
                <option value="sign">Sign / Tactile Plate</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">X Position (m left/right)</label>
              <input
                type="number"
                step="0.1"
                value={newNodeX}
                onChange={e => setNewNodeX(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300">Y Position (m forward)</label>
              <input
                type="number"
                step="0.1"
                value={newNodeY}
                onChange={e => setNewNodeY(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIsAddingNode(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold shadow"
            >
              Save to Memory
            </button>
          </div>
        </form>
      )}

      {/* 2D Topological Map Visualizer */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-slate-300">
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>2D Topological Floor Memory Projection (Caregiver & Specialist Map)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Path & Landmarks</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Furniture</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" /> Detected Hazards</span>
          </div>
        </div>

        <div className="w-full overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 flex justify-center p-2">
          <canvas 
            ref={canvasRef} 
            width={720} 
            height={440}
            className="w-full max-w-[720px] h-[360px] sm:h-[420px] rounded-lg"
          />
        </div>
      </div>

      {/* Memory Nodes Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col gap-4">
        <h3 className="text-base font-extrabold text-white">Learned Spatial Entities in this Memory</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Label</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Relative Coordinates</th>
                <th className="py-2.5 px-3">Persistence</th>
                <th className="py-2.5 px-3">Visits Observed</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {memory.nodes.map((node) => (
                <tr key={node.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{node.label}</span>
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-400">{node.category}</td>
                  <td className="py-3 px-3 font-mono text-cyan-300">
                    ({node.position.x >= 0 ? `+${node.position.x}` : node.position.x}m, +{node.position.y}m)
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold text-[10px] border border-emerald-800/50">
                      {(node.persistenceScore * 100).toFixed(0)}% Stable
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">{node.observationCount}</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDeleteNode(node.id)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded-lg transition"
                      title="Delete landmark"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
